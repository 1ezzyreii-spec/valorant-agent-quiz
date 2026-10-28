import { AGENTS } from './data.js';
import { markSVG } from './art.js';
const trustedAgents = new Map(AGENTS.map(agent => [agent.id, agent]));
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function createShareURL(base, id) {
  if (!trustedAgents.has(id)) throw new RangeError('未知英雄类型');
  const url = new URL(base);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new RangeError('分享链接需要HTTP或HTTPS');
  url.username = ''; url.password = ''; url.search = ''; url.hash = `agent=${id}`;
  return url.href;
}
function wrap(text, max) {
  const characters = Array.from(text);
  const lines = [];
  for (let start = 0; start < characters.length;) {
    let end = Math.min(start + max, characters.length);
    // A trailing closing mark may occupy one extra cell; never strand it next row.
    while (end < characters.length && /[，。！？；：、）】》」』”’]/.test(characters[end])) end++;
    if (end < characters.length && /[（【《「『“‘]/.test(characters[end - 1])) end--;
    lines.push(characters.slice(start, end).join(''));
    start = end;
  }
  return lines;
}
function text(value, x, y, size, extra = '') {
  return `<text x="${x}" y="${y}" font-size="${size}" ${extra}>${escape(value)}</text>`;
}
/**
 * 身份卡。portrait 必须是 data: URL（导出 canvas 时不能引用外部资源）；
 * 没有头像时退回姓名首字，保证离线或图片失败也能出卡。
 */
export function resultCardSVG(result, { portrait = null } = {}) {
  const agent = trustedAgents.get(result?.id);
  if (!agent) throw new RangeError('未知英雄类型');
  const description = wrap(agent.description, 25);
  const art = typeof portrait === 'string' && portrait.startsWith('data:image/')
    ? `<image href="${portrait}" x="250" y="316" width="400" height="408" preserveAspectRatio="xMidYMid meet"/>`
    : text(agent.name.slice(0, 1), 450, 570, 150, 'text-anchor="middle" font-family="SimSun,STSong,serif" fill="#c9c4b6"');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200" width="900" height="1200">
  <rect width="900" height="1200" fill="#faf9f5"/>
  <rect x="40" y="36" width="820" height="1128" fill="#fff" stroke="#e6e2d6" stroke-width="1.5"/>
  <g font-family="'Microsoft YaHei','PingFang SC',sans-serif" fill="#191a1e">
  <svg x="92" y="76" width="26" height="26" viewBox="0 0 32 32" color="#c9452f">${markSVG().replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>
  ${text('无畏档案室', 130, 99, 23, 'font-weight="600"')}${text('英雄档案卡', 806, 98, 16, 'text-anchor="end" fill="#6d6b67"')}
  <path d="M92 130H808" stroke="#e6e2d6" stroke-width="1.5"/>
  ${text('我最像的英雄是', 450, 182, 20, 'text-anchor="middle" fill="#6d6b67"')}
  ${text(agent.name, 450, 258, 72, 'text-anchor="middle" font-family="SimSun,STSong,serif" font-weight="600"')}
  ${text(`${agent.english} · ${agent.role}`, 450, 296, 18, 'text-anchor="middle" fill="#6d6b67"')}
  <circle cx="450" cy="520" r="188" fill="${agent.bg}"/>
  ${art}
  ${text(agent.title, 450, 774, 29, 'text-anchor="middle" font-weight="600"')}
  ${agent.tags.map((tag, index) => `<rect x="${180 + index * 183}" y="798" width="174" height="36" fill="#faf9f5"/>${text(tag, 267 + index * 183, 822, 18, 'text-anchor="middle" fill="#6d6b67"')}`).join('')}
  ${text('“' + agent.quote + '”', 450, 884, 25, 'text-anchor="middle" font-weight="500"')}
  ${description.map((line, index) => text(line, 450, 926 + index * 31, 22, 'text-anchor="middle" fill="#6d6b67"')).join('')}
  <path d="M92 1036H808" stroke="#e6e2d6" stroke-width="1.5"/>
  ${text('隐藏技能', 92, 1072, 17, 'fill="#6d6b67"')}${text(agent.superpower, 200, 1072, 20, 'font-weight="500"')}
  ${text(`定位 ${agent.role}　·　招牌技能 ${agent.ability}　·　常出没 ${agent.map}`, 92, 1106, 17, 'fill="#6d6b67"')}
  ${text('非官方粉丝作品 · 与 Riot Games 无关', 92, 1140, 15, 'fill="#6d6b67"')}${text('作者：栗子', 808, 1140, 20, 'text-anchor="end" font-weight="600"')}
  ${text('测测你最想像无畏契约哪位英雄 · 栗子出品', 450, 1188, 14, 'text-anchor="middle" fill="#6d6b67"')}
  </g></svg>`;
}
