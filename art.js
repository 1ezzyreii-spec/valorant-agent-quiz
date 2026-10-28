import { AGENTS } from './data.js';

const byID = new Map(AGENTS.map(agent => [agent.id, agent]));
const safe = id => (typeof id === 'string' && byID.has(id) ? byID.get(id) : AGENTS[0]);
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

/** 头像文件由构建期脚本从官方素材生成；文件名即英雄 id。 */
export function portraitURL(id, { thumb = false } = {}) {
  const agent = safe(id);
  return `./assets/agents/${agent.id}${thumb ? '-thumb' : ''}.webp`;
}

export function agentPortrait(id, { label = true, className = '', thumb = true, loading = 'lazy', eager = false } = {}) {
  const agent = safe(id);
  const alt = label ? `${agent.name}（${agent.english}）` : '';
  return `<img class="portrait${className ? ` ${className}` : ''}" src="${portraitURL(agent.id, { thumb })}" alt="${escape(alt)}" ${label ? '' : 'aria-hidden="true" '}loading="${eager ? 'eager' : loading}" decoding="async" width="420" height="700">`;
}

/** 站点标记：一个档案菱形，出现在页头与按钮里。 */
export function markSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3.5l11.5 12.5L16 28.5 4.5 16z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M16 10.5L21 16l-5 5.5-5-5.5z" fill="currentColor"/></svg>`;
}

/** 首页主视觉：三张错开的档案卡，最上面一张还没揭晓。 */
export function heroStack(ids = ['sage', 'phoenix', 'jett']) {
  return `<div class="stack" aria-hidden="true">${ids.map((id, index) => {
    const agent = safe(id);
    const layer = ['back', 'mid', 'front'][index] || 'front';
    // 后面两张只做档案标签卡：露出窄边时不会显示半张脸或一截手臂。
    if (layer !== 'front') return `<figure class="stack-card ${layer}" style="--agent-bg:${agent.bg}"><span class="stack-label">${agent.role}</span></figure>`;
    return `<figure class="stack-card front" style="--agent-bg:${agent.bg}">${agentPortrait(agent.id, { label: false, thumb: true, eager: true })}<figcaption class="stack-question">?</figcaption></figure>`;
  }).join('')}</div>`;
}
