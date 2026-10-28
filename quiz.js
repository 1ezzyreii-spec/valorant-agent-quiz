import { AGENTS, QUESTIONS, TRAITS } from './data.js';

const AGENT_BY_ID = new Map(AGENTS.map(agent => [agent.id, agent]));
const AGENT_ORDER = new Map(AGENTS.map((agent, index) => [agent.id, index]));
const TRAIT_KEYS = TRAITS.map(trait => trait.key);
const MAX_AGENT_SCORE = 5;
// 题库里各维度的出现频率并不相同（例如「守护」天然更容易被问到）。
// 先减去随机作答下的期望值，再比较形状，避免所有人都被判成稳重系英雄。
const EXPECTED = Object.fromEntries(TRAIT_KEYS.map(key => [
  key,
  QUESTIONS.reduce((total, question) => total + question.options.reduce((sum, option) => sum + (option.w[key] || 0), 0) / question.options.length, 0),
]));

function isAnswer(value) {
  return Number.isInteger(value) && value >= 0 && value <= 3;
}

function validateAnswers(answers) {
  if (!Array.isArray(answers) || answers.length !== QUESTIONS.length) {
    throw new RangeError(`请完成全部 ${QUESTIONS.length} 道题后再查看结果。`);
  }
  // Indexed reads reject sparse arrays, which Array.prototype.every skips.
  for (let index = 0; index < QUESTIONS.length; index += 1) {
    if (!isAnswer(answers[index])) throw new RangeError('每道题需要一个 0 到 3 的整数选项。');
  }
}

/** 把作答累加成六维原始分；O(题数 × 每选项维度数)。 */
export function traitScores(answers) {
  validateAnswers(answers);
  const scores = Object.fromEntries(TRAIT_KEYS.map(key => [key, 0]));
  for (let index = 0; index < QUESTIONS.length; index += 1) {
    const weights = QUESTIONS[index].options[answers[index]].w;
    for (const [key, value] of Object.entries(weights)) scores[key] += value;
  }
  return scores;
}

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/** 皮尔逊相关：比较「形状」而不是绝对强度，避免高分维度多的英雄永远获胜。 */
function correlation(left, right) {
  const meanLeft = mean(left);
  const meanRight = mean(right);
  let covariance = 0;
  let varianceLeft = 0;
  let varianceRight = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index] - meanLeft;
    const b = right[index] - meanRight;
    covariance += a * b;
    varianceLeft += a * a;
    varianceRight += b * b;
  }
  if (varianceLeft === 0 || varianceRight === 0) return 0;
  return covariance / Math.sqrt(varianceLeft * varianceRight);
}

function distance(left, right) {
  let total = 0;
  for (let index = 0; index < left.length; index += 1) total += (left[index] - right[index]) ** 2;
  return Math.sqrt(total);
}

/**
 * 结果 = 六维向量与 30 位英雄人格向量的形状相似度。
 * 平手时先比距离（更接近绝对强度），再按档案顺序，保证跨设备稳定。
 * percent 是契合度（相关度映射到 0-100），不是人群占比或胜率。
 */
export function scoreAnswers(answers) {
  const scores = traitScores(answers);
  const user = TRAIT_KEYS.map(key => scores[key] - EXPECTED[key]);
  const peak = Math.max(...user) || 1;
  const normalizedUser = user.map(value => value / peak);

  const ranking = AGENTS.map(agent => {
    const profile = agent.traits.map(value => value / MAX_AGENT_SCORE);
    const similarity = correlation(normalizedUser, profile);
    return {
      id: agent.id,
      score: similarity,
      percent: Math.round((similarity + 1) / 2 * 100),
      distance: distance(normalizedUser, profile),
    };
  }).sort((left, right) => right.score - left.score
    || left.distance - right.distance
    || AGENT_ORDER.get(left.id) - AGENT_ORDER.get(right.id));

  return { scores, ranking };
}

export function getResult(answers) {
  const { scores, ranking } = scoreAnswers(answers);
  return {
    agent: AGENT_BY_ID.get(ranking[0].id),
    secondary: AGENT_BY_ID.get(ranking[1].id),
    scores,
    ranking,
  };
}

/** 六维展示值：按本次最高维度归一，四舍五入到整数百分比。 */
export function traitProfile(answers) {
  const scores = traitScores(answers);
  const peak = Math.max(...Object.values(scores)) || 1;
  return TRAITS.map(trait => ({
    key: trait.key,
    name: trait.name,
    note: trait.note,
    value: Math.round(scores[trait.key] / peak * 100),
  }));
}

/** Only a whitelisted result id is shareable; answers never enter the URL. */
export function encodeResult(result) {
  const id = typeof result === 'string' ? result : result?.agent?.id ?? result?.id;
  if (!AGENT_BY_ID.has(id)) throw new RangeError('结果类型不在题库中。');
  return `#agent=${id}`;
}

/** Exact matching rejects query additions, encoding tricks and HTML strings. */
export function decodeResult(hash) {
  if (typeof hash !== 'string' || !hash.startsWith('#agent=')) return null;
  return AGENT_BY_ID.get(hash.slice(7)) ?? null;
}

/**
 * Parse untrusted saved progress into a fresh, bounded data-only object.
 * Answered items must form one prefix; index may review that prefix or point
 * at its first unanswered item, but may not skip forward. O(question count).
 */
export function restoreProgress(raw) {
  if (typeof raw !== 'string') return null;
  let saved;
  try { saved = JSON.parse(raw); } catch { return null; }
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)
    || !Object.hasOwn(saved, 'answers') || !Object.hasOwn(saved, 'index')) return null;
  if (!Array.isArray(saved.answers) || saved.answers.length !== QUESTIONS.length
    || !Number.isInteger(saved.index) || saved.index < 0 || saved.index >= QUESTIONS.length) return null;

  const answers = [];
  let firstUnanswered = QUESTIONS.length;
  for (let index = 0; index < QUESTIONS.length; index += 1) {
    const answer = saved.answers[index];
    if (answer === null) {
      if (firstUnanswered === QUESTIONS.length) firstUnanswered = index;
    } else if (!isAnswer(answer) || firstUnanswered !== QUESTIONS.length) {
      return null;
    }
    answers.push(answer);
  }
  if (saved.index > firstUnanswered) return null;
  return { answers, index: saved.index };
}
