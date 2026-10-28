import { AGENTS, QUESTIONS } from './data.js';
import { getResult, encodeResult, decodeResult, traitProfile } from './quiz.js';
import { agentPortrait, markSVG, portraitURL } from './art.js';
import { newSession, chooseAnswer, nextQuestion, previousQuestion } from './session.js';
import { resultCardSVG, createShareURL } from './share-card.js';
import { createPersistence } from './persistence.js';
import { renderHomeMarkup } from './home.js';

const app = document.getElementById('app');
const modal = document.getElementById('modal');
let browserStorage = null;
try { browserStorage = localStorage; } catch { /* 禁用存储时仍可做题。 */ }
const persistence = createPersistence(browserStorage);
let session = newSession();
let screen = 'home';
let beforeGallery = 'home';
let currentResult = null;
let isShared = false;
let savedProgress = null;
let toastTimer;
let previewObjectURL = null;
let modalOpener = null;
let viewGeneration = 0;

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const mark = `<span class="mark" aria-hidden="true">${markSVG()}</span>`;
document.getElementById('brand-mark').innerHTML = markSVG();

function notify(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
}
function readProgress() {
  return persistence.loadProgress();
}
function saveProgress() {
  savedProgress = { answers: [...session.answers], index: session.index };
  persistence.saveProgress(savedProgress);
}
function clearProgress() {
  savedProgress = null;
  persistence.clearProgress();
}
function clearHash() { history.replaceState(null, '', location.pathname + location.search); }
function updateMainFocus(selector) {
  window.scrollTo({ top: 0, behavior: 'instant' });
  requestAnimationFrame(() => (document.querySelector(selector) || document.getElementById('main')).focus({ preventScroll: true }));
}
function openModal(content) {
  if (!modal.open) modalOpener = document.activeElement;
  modal.innerHTML = content;
  if (!modal.open) modal.showModal();
}
function modalHeader(title) {
  return `<div class="dialog-top"><h2 id="modal-title">${escape(title)}</h2><button class="close" data-action="close" aria-label="关闭弹窗">×</button></div>`;
}
function setScreen(value, focus = true) {
  viewGeneration += 1;
  screen = value;
  if (value === 'home') renderHome();
  if (value === 'quiz') renderQuiz();
  if (value === 'gallery') renderGallery();
  if (value === 'result') renderResult();
  if (value === 'records') renderRecords();
  if (focus) updateMainFocus(value === 'quiz' ? '#question-title' : '#main');
}
function renderHome() {
  const hasProgress = savedProgress?.answers.some(value => value !== null);
  app.innerHTML = renderHomeMarkup({ hasProgress, hasResults: persistence.listResults().length > 0 });
}
function renderRecords() {
  const records = persistence.listResults();
  const status = persistence.status().persistent ? '已保存在当前浏览器。更换设备或清理浏览器前，可以先导出备份。' : '当前浏览器暂不支持本地保存；请导出备份，避免关闭页面后丢失。';
  app.innerHTML = `<section class="gallery"><button class="back" data-action="home">← 返回首页</button><div class="page-heading"><div><h1>我的英雄记录</h1><p>留住每次测出的英雄，最近 20 次会保存在这台设备。<span class="byline">整理：栗子</span></p></div><button class="secondary" data-action="backup">备份与恢复</button></div><p class="storage-note">${status}</p><div class="saved-records">${records.length ? records.map(record => { const agent = AGENTS.find(item => item.id === record.agentId); const date = new Date(record.createdAt).toLocaleString('zh-CN', { hour12: false }); return `<button class="saved-record" data-action="open-record" data-time="${record.createdAt}"><span class="record-art">${agentPortrait(agent.id, { label: false })}</span><span><strong>${escape(agent.name)}</strong><small>${escape(agent.title)}</small><time>${escape(date)}</time></span><span class="record-open" aria-hidden="true">↗</span></button>`; }).join('') : '<p class="empty-records">还没有英雄记录，完成一次测试就会出现在这里。<br><button class="primary" data-action="start">开始测试</button></p>'}</div></section>`;
}
function showBackup() {
  if (previewObjectURL) URL.revokeObjectURL(previewObjectURL);
  previewObjectURL = URL.createObjectURL(new Blob([persistence.exportArchive()], { type: 'application/json;charset=utf-8' }));
  openModal(`${modalHeader('备份与恢复')}<div class="dialog-body"><p>导出的文件含本机测试记录和答题进度，不会上传到服务器。换设备时打开同一网站，再导入这个文件即可恢复。</p><p>浏览器可能清理本地数据；保存一份备份，才是自己能掌握的长期副本。</p><a class="primary download-link" href="${previewObjectURL}" download="栗子-英雄档案备份.json">导出测试记录</a><label class="backup-import">导入备份文件<input id="backup-file" type="file" accept="application/json,.json"></label><p>导入会恢复备份中的答题进度，合并历史记录并保留最近 20 次。</p><button class="text-button" data-action="persist-device">申请更稳定的设备保存</button></div>`);
}
function renderQuiz() {
  const question = QUESTIONS[session.index];
  const selected = session.answers[session.index];
  app.innerHTML = `<section class="page-shell question-fade" aria-label="英雄档案答题">
    <div class="page-top"><button class="back" data-action="exit">← 稍后再测</button><span class="progress-label"><b>${String(session.index + 1).padStart(2, '0')}</b> / ${QUESTIONS.length}</span></div>
    <div class="progress" role="progressbar" aria-label="答题进度" aria-valuemin="0" aria-valuemax="${QUESTIONS.length}" aria-valuenow="${session.answers.filter(value => value !== null).length}"><span style="width:${session.answers.filter(value => value !== null).length / QUESTIONS.length * 100}%"></span></div>
    <div class="quiz-card"><div class="quiz-illustration">${agentPortrait(AGENTS[session.index % AGENTS.length].id, { label: false })}</div>
      <p class="scene">${escape(question.scene)}</p><h1 class="question-title" id="question-title" tabindex="-1">${escape(question.title)}</h1>
      <div class="options" role="group" aria-labelledby="question-title">${question.options.map((option, index) => `<button class="option${selected === index ? ' selected' : ''}" aria-pressed="${selected === index}" data-action="choose" data-index="${index}"><span class="letter" aria-hidden="true">${'ABCD'[index]}</span><span>${escape(option.text)}</span><span class="check" aria-hidden="true">${selected === index ? '✓' : ''}</span></button>`).join('')}</div>
      <div class="quiz-bottom"><button class="back" data-action="previous" ${session.index === 0 ? 'disabled' : ''}>← 上一题</button><button id="next-button" class="primary" data-action="next" ${selected === null ? 'disabled' : ''}>${session.index === QUESTIONS.length - 1 ? '揭晓我的英雄' : '下一题'} <span aria-hidden="true">→</span></button></div>
    </div><p class="quiz-note">选你真实会做的，不用选“看起来更强”的。<br>随时可以返回修改，进度会保存在当前浏览器。<span class="byline">题目与文案：栗子</span></p>
  </section>`;
}
function renderGallery() {
  app.innerHTML = `<section class="gallery"><button class="back" data-action="gallery-back">← 返回${beforeGallery === 'result' ? '我的英雄' : beforeGallery === 'quiz' ? '答题' : '首页'}</button>
    <div class="page-heading"><div><h1>英雄档案</h1><p>${AGENTS.length} 位英雄，${AGENTS.length} 种打法。<br>没有最强的那个，只有最像你的那个。<span class="byline">整理：栗子</span></p></div><span class="gallery-count">全员到齐 · ${AGENTS.length} / ${AGENTS.length}</span></div>
    <div class="agent-grid">${AGENTS.map(agent => `<button class="agent-tile" data-action="inspect" data-id="${agent.id}" style="--agent-bg:${agent.bg}"><div class="agent-picture">${agentPortrait(agent.id, { label: false })}</div><h2>${escape(agent.name)}<span aria-hidden="true">↗</span></h2><p>${escape(agent.role)} · ${escape(agent.title)}</p><small>${agent.tags.map(escape).join(' / ')}</small></button>`).join('')}</div>
  </section>`;
}
function renderResult() {
  if (!currentResult) { setScreen('home'); return; }
  const agent = currentResult.agent;
  const buddy = AGENTS.find(item => item.id === agent.buddy) || AGENTS.find(item => item.id !== agent.id);
  // 分享卡只带英雄 id，没有作答记录；此时不展示六维，避免用空数据算出假结果。
  const traits = Array.isArray(currentResult.answers) && currentResult.answers.every(value => Number.isInteger(value))
    ? traitProfile(currentResult.answers)
    : null;
  app.innerHTML = `<section class="result-page" style="--agent-bg:${agent.bg};--agent-color:${agent.color}"><button class="back" data-action="home">← 返回首页</button>
    <p class="result-intro">${isShared ? '你打开了一张英雄档案卡，来认识这位英雄吧。' : '档案已解密，你身体里住着这位英雄。'}</p>
    <article class="identity-card" aria-label="${escape(agent.name)}英雄档案卡"><div class="identity-top"><div class="identity-copy"><p class="card-kicker">英雄档案 · AGENT FILE</p><h1>${escape(agent.name)}</h1><p class="english">${escape(agent.english)} · ${escape(agent.role)}</p><h2>${escape(agent.title)}</h2><div class="agent-tags">${agent.tags.map(tag => `<span>${escape(tag)}</span>`).join('')}</div></div><div class="agent-picture">${agentPortrait(agent.id, { eager: true, thumb: false })}</div></div>
    <div class="identity-body"><p class="agent-quote">“${escape(agent.quote)}”</p><p class="agent-description">${escape(agent.description)}</p><div class="agent-skills"><dl><dt>你的隐藏技能</dt><dd>${escape(agent.superpower)}</dd></dl><dl><dt>你的充能方式</dt><dd>${escape(agent.energy)}</dd></dl></div><div class="identity-meta"><span>招牌技能 · ${escape(agent.ability)}</span><span>常出没 · ${escape(agent.map)}</span></div><div class="identity-stamp"><span class="stamp">${mark}无畏档案室 · 作者 栗子</span><span>不是给你贴标签，是看看你会怎么打。</span></div></div></article>
    <div class="result-actions"><button class="primary" data-action="save-card">保存结果图${mark}</button><button class="secondary" data-action="share">分享给朋友 ↗</button></div>
    ${isShared ? `<div class="shared-cta"><p>这位英雄挺适合你，那你呢？</p><button class="primary" data-action="start">我也要测一测${mark}</button></div>` : `<div class="result-subactions"><button data-action="restart">再测一次</button><button data-action="gallery">看看其他英雄</button></div>`}
    <div class="more-result">${!isShared && traits ? `<section class="detail-panel wide"><h2>你的六维</h2><p class="panel-note">24 题累加后按最高项归一，越靠右越明显</p><div class="trait-list">${traits.map(trait => `<div class="trait-row"><span>${escape(trait.name)}</span><span class="trait-track"><i style="width:${trait.value}%"></i></span><b>${trait.value}</b></div>`).join('')}</div></section><section class="detail-panel"><h2>最接近的四位</h2><p class="panel-note">形状相似度，不是人群占比</p>${currentResult.ranking.slice(0, 4).map(item => { const type = AGENTS.find(value => value.id === item.id); return `<div class="trait-row"><span>${escape(type.name)}</span><span class="trait-track"><i style="width:${item.percent}%;--agent-color:${type.color}"></i></span><b>${item.percent}%</b></div>`; }).join('')}</section>` : `<section class="detail-panel wide"><h2>英雄观察笔记</h2><p class="panel-note">这是一张分享卡，不包含答题记录。</p><p class="panel-quote">${escape(agent.quote)}<br>没有最强的英雄，只有最像你的打法。</p></section>`}
    <section class="detail-panel${isShared ? ' wide' : ''}"><h2>适合一起开黑的搭子</h2><div class="buddy-row"><div class="buddy-art">${agentPortrait(buddy.id, { label: false })}</div><div><strong>${escape(buddy.name)}</strong><span>${escape(buddy.role)} · ${escape(buddy.title)}</span></div></div><p>${escape(agent.buddyNote)}</p></section></div>
    <p class="small-disclaimer">今天测出的英雄，只是你的一个侧面。<br>非官方粉丝作品，与 Riot Games 无关；也不是游戏水平测评。<span class="byline">档案制作：栗子</span></p>
  </section>`;
}
function startQuiz() {
  clearHash();
  session = newSession();
  saveProgress();
  setScreen('quiz');
}
function inspectAgent(id) {
  const agent = AGENTS.find(item => item.id === id);
  if (!agent) return;
  openModal(`${modalHeader(agent.name + ' · ' + agent.title)}<div class="modal-agent" style="--agent-bg:${agent.bg}">${agentPortrait(agent.id, { thumb: false })}</div><div class="agent-tags modal-tags">${agent.tags.map(tag => `<span>${escape(tag)}</span>`).join('')}</div><p class="modal-quote">“${escape(agent.quote)}”</p><p class="modal-description">${escape(agent.description)}</p><p class="modal-meta">定位 ${escape(agent.role)}　·　招牌技能 ${escape(agent.ability)}　·　常出没 ${escape(agent.map)}</p><div class="dialog-actions"><button class="secondary" data-action="close">记住这位英雄</button></div>`);
}
function showAbout() {
  openModal(`${modalHeader('关于无畏档案室')}<div class="dialog-body"><p><strong>作者：栗子</strong><br>写给开黑的朋友、放学后的搭子，以及想知道自己会怎么打的人。</p><p>24 道日常与对局情境，${AGENTS.length} 位英雄。题目、文案与解读均为原创，用六个人格维度去描述你的选择倾向，再匹配到最接近的英雄。</p><p>这是一个趣味小测试，不是心理测评，也不代表你的真实水平。每个结果都值得被喜欢，没有强弱之分。</p><p>答案只保存在当前浏览器，不会上传。分享链接只包含英雄类型，不包含你的答题记录。百分比是形状相似度，不是人群占比或胜率。</p><p>非官方粉丝作品，与 Riot Games 无关；英雄名称与形象版权归 Riot Games 所有。</p></div><div class="dialog-actions"><button class="primary" data-action="close">知道啦${mark}</button></div>`);
}
function askRestart() {
  openModal(`${modalHeader('重新测一次？')}<p class="dialog-body">重新开始会清空当前答题进度。已完成的测试记录和档案卡图片都会保留。</p><div class="dialog-actions"><button class="secondary" data-action="close">先不重测</button><button class="primary" data-action="confirm-restart">重新开始</button></div>`);
}
async function shareResult() {
  const agent = currentResult.agent;
  const url = createShareURL(location.href, agent.id);
  try {
    if (navigator.share) {
      await navigator.share({ title: `我最像${agent.name}，你呢？`, text: `“${agent.quote}” 测测你最像无畏契约里哪个英雄。作者：栗子`, url });
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      notify('结果链接已复制，发给你的搭子吧！');
    } else showShareLink(url);
  } catch (error) {
    if (error.name === 'AbortError') return;
    showShareLink(url);
  }
}
function showShareLink(url) {
  openModal(`${modalHeader('把英雄分享给朋友')}<p class="dialog-body">复制下面的链接，就能分享这张英雄档案卡。</p><input class="share-input" id="share-input" aria-label="结果分享链接" value="${escape(url)}" readonly><div class="dialog-actions"><button class="secondary" data-action="select-link">选中链接</button><button class="primary" data-action="close">知道啦</button></div>`);
  const input = document.getElementById('share-input');
  input.focus(); input.select();
}
async function portraitDataURL(id) {
  const response = await fetch(portraitURL(id));
  if (!response.ok) throw new Error('portrait-unavailable');
  const blob = await response.blob();
  // 某些静态服务器不认 .webp，会回 application/octet-stream；
  // 这里显式声明图片类型，保证导出的 data URL 能被 <image> 接受。
  const typed = blob.type.startsWith('image/') ? blob : new Blob([await blob.arrayBuffer()], { type: 'image/webp' });
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('portrait-read-failed'));
    reader.readAsDataURL(typed);
  });
}
async function saveCard() {
  const agent = currentResult.agent;
  const generation = viewGeneration;
  const button = document.querySelector('[data-action="save-card"]');
  if (button) { button.disabled = true; button.textContent = '正在生成档案卡…'; }
  try {
    // 头像必须内联成 data URL，否则 canvas 导出会因跨资源限制而空白。
    const portrait = await portraitDataURL(agent.id).catch(() => null);
    const svg = resultCardSVG(agent, { portrait });
    const source = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const image = new Image();
    try {
      image.src = source;
      await image.decode();
      // 导出属于触发时的页面，切换到新题/新结果后丢弃旧异步任务。
      if (generation !== viewGeneration || modal.open) return;
      const canvas = document.createElement('canvas');
      canvas.width = 900; canvas.height = 1200;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('canvas-unavailable');
      context.drawImage(image, 0, 0, 900, 1200);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('image-export-failed');
      if (generation !== viewGeneration || modal.open) return;
      if (previewObjectURL) URL.revokeObjectURL(previewObjectURL);
      previewObjectURL = URL.createObjectURL(blob);
      openModal(`${modalHeader('你的英雄档案卡')}<img class="save-preview" src="${previewObjectURL}" alt="${escape(agent.name)}档案卡，作者栗子"><p class="save-help">手机可以长按图片保存；电脑点击下方下载。<br>卡片已带作者「栗子」署名。</p><a class="primary download-link" href="${previewObjectURL}" download="我的${escape(agent.name)}档案卡-栗子.png">下载档案卡 ↓</a>`);
    } finally { URL.revokeObjectURL(source); }
  } catch (error) { console.error('档案卡导出失败', error); if (generation === viewGeneration) notify('图片暂时没生成，请重试；也可以直接截图保存档案卡。'); }
  finally { if (button) { button.disabled = false; button.innerHTML = `保存结果图${mark}`; } }
}

document.addEventListener('click', event => {
  if (event.target.closest('.skip-link')) {
    event.preventDefault();
    document.getElementById('main').focus();
    return;
  }
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === 'about') showAbout();
  if (action === 'records') setScreen('records');
  if (action === 'backup') showBackup();
  if (action === 'open-record') {
    const record = persistence.listResults().find(item => item.createdAt === Number(button.dataset.time));
    if (record) { currentResult = { ...getResult(record.answers), answers: [...record.answers] }; isShared = false; history.replaceState(null, '', encodeResult(currentResult)); setScreen('result'); }
  }
  if (action === 'persist-device') {
    if (navigator.storage?.persist) void navigator.storage.persist().then(granted => notify(granted ? '浏览器已允许更稳定的本地保存，备份文件仍建议保留。' : '浏览器未授予持久保存，请导出备份留存。')).catch(() => notify('当前浏览器不支持此操作，请导出备份。'));
    else notify('当前浏览器不支持此操作，请导出备份。');
  }
  if (action === 'close') modal.close();
  if (action === 'start') startQuiz();
  if (action === 'continue') {
    if (!savedProgress) startQuiz();
    else { session = { ...savedProgress, answers: [...savedProgress.answers], completed: false }; clearHash(); setScreen('quiz'); }
  }
  if (action === 'home' || action === 'exit') { clearHash(); setScreen('home'); }
  if (action === 'gallery') { if (screen !== 'gallery') beforeGallery = screen; setScreen('gallery'); }
  if (action === 'gallery-back') setScreen(beforeGallery);
  if (action === 'inspect') inspectAgent(button.dataset.id);
  if (action === 'choose') {
    session = chooseAnswer(session, Number(button.dataset.index));
    saveProgress();
    // 只更新选项与下一题状态，保留键盘焦点，避免重复朗读整题。
    document.querySelectorAll('.option').forEach((option, index) => {
      const selected = session.answers[session.index] === index;
      option.classList.toggle('selected', selected);
      option.setAttribute('aria-pressed', String(selected));
      option.querySelector('.check').textContent = selected ? '✓' : '';
    });
    document.getElementById('next-button').disabled = false;
    const progress = document.querySelector('.progress');
    const answered = session.answers.filter(value => value !== null).length;
    progress?.setAttribute('aria-valuenow', String(answered));
    const bar = document.querySelector('.progress>span');
    if (bar) bar.style.width = `${answered / QUESTIONS.length * 100}%`;
  }
  if (action === 'previous') { session = previousQuestion(session); saveProgress(); setScreen('quiz'); }
  if (action === 'next') {
    session = nextQuestion(session);
    if (session.completed) {
      currentResult = { ...getResult(session.answers), answers: [...session.answers] };
      persistence.saveResult(session.answers);
      isShared = false;
      clearProgress();
      history.replaceState(null, '', encodeResult(currentResult));
      setScreen('result');
    } else { saveProgress(); setScreen('quiz'); }
  }
  if (action === 'restart') askRestart();
  if (action === 'confirm-restart') { modal.close(); clearProgress(); startQuiz(); }
  if (action === 'share') void shareResult();
  if (action === 'save-card') void saveCard();
  if (action === 'select-link') { const input = document.getElementById('share-input'); input.focus(); input.select(); }
});
document.addEventListener('change', async event => {
  if (event.target.id !== 'backup-file') return;
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 64 * 1024) { notify('备份文件超过 64KB，请选择本站导出的记录文件。'); return; }
  try {
    const restored = persistence.importArchive(await file.text());
    savedProgress = persistence.loadProgress();
    modal.close(); setScreen('records');
    notify(`已恢复 ${restored.resultCount} 条记录${restored.hasProgress ? '和未完成进度' : ''}。`);
  } catch (error) { notify(error.message || '备份文件格式不正确，原有记录未改变。'); }
});
modal.addEventListener('click', event => { if (event.target === modal) { const rect = modal.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) modal.close(); } });
modal.addEventListener('close', () => { if (previewObjectURL) { URL.revokeObjectURL(previewObjectURL); previewObjectURL = null; } if (modalOpener?.isConnected) modalOpener.focus({ preventScroll: true }); });
function loadSharedResult() {
  const agent = decodeResult(location.hash);
  if (agent) { const ownResult = persistence.loadResult(agent.id); currentResult = ownResult || { agent }; isShared = !ownResult; setScreen('result', false); }
  else { if (location.hash.startsWith('#agent=')) { clearHash(); notify('这张英雄档案卡没有找到，重新测一次吧。'); } setScreen('home', false); }
}
window.addEventListener('hashchange', () => { if (location.hash !== '#main') loadSharedResult(); });
savedProgress = readProgress();
loadSharedResult();
const bootState = document.getElementById('boot-state');
if (bootState) bootState.hidden = true;
