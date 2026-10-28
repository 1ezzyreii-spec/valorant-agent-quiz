import { restoreProgress, getResult } from './quiz.js';

const PROGRESS_KEY = 'agent-file-progress-v1';
const RESULTS_KEY = 'agent-file-results-v1';
const MAX_RESULTS = 20;
const MAX_ARCHIVE_BYTES = 64 * 1024;
const MAX_TIMESTAMP = 8640000000000000;
const ARCHIVE_FIELDS = ['format', 'version', 'exportedAt', 'progress', 'results'];
const RECORD_FIELDS = ['version', 'createdAt', 'answers', 'agentId'];
const PROGRESS_FIELDS = ['answers', 'index'];

function hasExactFields(value, fields) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === fields.length
    && fields.every(field => Object.hasOwn(value, field));
}

function isTimestamp(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= MAX_TIMESTAMP;
}

function copyProgress(progress) {
  return progress === null ? null : { answers: [...progress.answers], index: progress.index };
}

function copyRecord(record) {
  return { version: 1, createdAt: record.createdAt, answers: [...record.answers], agentId: record.agentId };
}

function parseJSON(raw) {
  if (typeof raw !== 'string') return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function normalizeProgress(value, strict = false) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (strict && !hasExactFields(value, PROGRESS_FIELDS)) return null;
  // The existing {answers,index} format remains readable. A declared future
  // version must not accidentally become valid through the permissive parser.
  if (Object.hasOwn(value, 'version') && value.version !== 1) return null;
  try { return restoreProgress(JSON.stringify(value)); } catch { return null; }
}

function normalizeRecord(value) {
  if (!hasExactFields(value, RECORD_FIELDS) || value.version !== 1
    || !isTimestamp(value.createdAt) || typeof value.agentId !== 'string') return null;
  try {
    const result = getResult(value.answers);
    if (result.agent.id !== value.agentId) return null;
    return copyRecord(value);
  } catch { return null; }
}

/** Newest first. Imported timestamp collisions prefer the incoming snapshot. */
function mergeResults(incoming, existing = []) {
  const byTimestamp = new Map();
  for (const record of [...incoming, ...existing]) {
    if (!byTimestamp.has(record.createdAt)) byTimestamp.set(record.createdAt, copyRecord(record));
  }
  return [...byTimestamp.values()]
    .sort((left, right) => right.createdAt - left.createdAt).slice(0, MAX_RESULTS);
}

function readResults(raw) {
  const saved = parseJSON(raw);
  if (!Array.isArray(saved)) return [];
  // Storage is untrusted too: do not parse an unbounded history on every load.
  if (typeof raw === 'string' && raw.length > MAX_ARCHIVE_BYTES) return [];
  const valid = [];
  for (const value of saved) {
    const record = normalizeRecord(value);
    if (record) valid.push(record);
  }
  return mergeResults(valid);
}

function decodeArchive(raw) {
  const reject = () => { throw new RangeError('备份格式无效、版本不支持或数据损坏。'); };
  // Check characters first, so obviously huge input is not copied by TextEncoder.
  if (typeof raw !== 'string' || raw.length > MAX_ARCHIVE_BYTES
    || new TextEncoder().encode(raw).byteLength > MAX_ARCHIVE_BYTES) reject();
  const value = parseJSON(raw);
  if (!hasExactFields(value, ARCHIVE_FIELDS) || value.format !== 'agent-file-backup'
    || value.version !== 1 || !isTimestamp(value.exportedAt)
    || !Array.isArray(value.results) || value.results.length > MAX_RESULTS) reject();
  const progress = value.progress === null ? null : normalizeProgress(value.progress, true);
  if (value.progress !== null && progress === null) reject();
  const results = [];
  for (const item of value.results) {
    const record = normalizeRecord(item);
    if (!record) reject();
    results.push(record);
  }
  return { progress, results };
}

/**
 * Bounded local-first storage, with no network or external dependencies.
 * Reads are snapshotted at creation; returned arrays never alias that snapshot.
 * status().persistent describes the latest storage access, not a durability
 * promise: browsers may clear local data, so exportArchive is the portable copy.
 * Normal operations cost O(20 × 12); import validation is bounded to 64 KiB.
 */
export function createPersistence(storage, { now = () => Date.now() } = {}) {
  let access = null;
  let persistent = false;
  let durableProgress = null;
  let durableResults = null;
  try {
    if (storage && typeof storage.getItem === 'function'
      && typeof storage.setItem === 'function' && typeof storage.removeItem === 'function') {
      access = {
        get: key => storage.getItem(key),
        set: (key, value) => storage.setItem(key, value),
        remove: key => storage.removeItem(key),
      };
      durableProgress = access.get(PROGRESS_KEY);
      durableResults = access.get(RESULTS_KEY);
      persistent = true;
    }
  } catch {
    // A blocked localStorage getter is indistinguishable from unavailable storage.
    persistent = false;
  }
  let snapshot = {
    progress: normalizeProgress(parseJSON(durableProgress)),
    results: readResults(durableResults),
  };

  function timestamp() {
    const value = now();
    if (!isTimestamp(value)) throw new RangeError('保存时间需要有效的 Unix 毫秒整数。');
    return value;
  }

  function writeRaw(key, raw) {
    if (raw === null) access.remove(key);
    else access.set(key, raw);
  }

  function commit(progress, results) {
    // First form and swap one complete memory snapshot. A failed disk write must
    // never leave new progress paired with old history (or discard quiz answers).
    const next = { progress: copyProgress(progress), results: results.map(copyRecord) };
    const nextProgress = next.progress === null ? null : JSON.stringify(next.progress);
    const nextResults = JSON.stringify(next.results);
    snapshot = next;
    if (!access) { persistent = false; return; }
    try {
      writeRaw(PROGRESS_KEY, nextProgress);
      writeRaw(RESULTS_KEY, nextResults);
      durableProgress = nextProgress;
      durableResults = nextResults;
      persistent = true;
    } catch {
      persistent = false;
      // Web Storage has no cross-key transactions. Roll back both original raw
      // values on an exception; retain the coherent new snapshot in memory.
      // If storage also rejects rollback (or the process dies mid-write), disk
      // atomicity cannot be guaranteed; status remains false. A later successful
      // mutation writes the full memory snapshot and repairs both keys together.
      try { writeRaw(PROGRESS_KEY, durableProgress); } catch { /* storage remains unavailable */ }
      try { writeRaw(RESULTS_KEY, durableResults); } catch { /* storage remains unavailable */ }
    }
  }

  return {
    loadProgress() { return copyProgress(snapshot.progress); },

    saveProgress(progress) {
      const validated = normalizeProgress(progress);
      if (!validated) throw new RangeError('答题进度无效，未替换现有进度。');
      commit(validated, snapshot.results);
    },

    clearProgress() { commit(null, snapshot.results); },

    saveResult(answers) {
      // getResult rejects incomplete, sparse or out-of-range answers before writes.
      const result = getResult(answers);
      const record = { version: 1, createdAt: timestamp(), answers: [...answers], agentId: result.agent.id };
      const results = [record, ...snapshot.results]
        .sort((left, right) => right.createdAt - left.createdAt).slice(0, MAX_RESULTS);
      commit(snapshot.progress, results);
      return copyRecord(record);
    },

    listResults() { return snapshot.results.map(copyRecord); },

    loadResult(agentId) {
      if (typeof agentId !== 'string') return null;
      const record = snapshot.results.find(value => value.agentId === agentId);
      // 带上作答记录，刷新结果页时才能重绘六维，而不是只显示一张分享卡。
      return record ? { ...getResult([...record.answers]), answers: [...record.answers] } : null;
    },

    exportArchive() {
      return JSON.stringify({
        format: 'agent-file-backup', version: 1, exportedAt: timestamp(),
        progress: copyProgress(snapshot.progress), results: snapshot.results.map(copyRecord),
      });
    },

    importArchive(raw) {
      // All validation completes before either in-memory or persistent state moves.
      // Invalid data errors are deliberately not caught by the storage fallback.
      const incoming = decodeArchive(raw);
      const results = mergeResults(incoming.results, snapshot.results);
      commit(incoming.progress, results);
      return { resultCount: results.length, hasProgress: incoming.progress !== null };
    },

    status() { return { persistent }; },
  };
}
