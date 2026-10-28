import { agentPortrait, heroStack, markSVG } from './art.js';
import { AGENTS } from './data.js';

/** Shared by the release pre-renderer and browser: first paint needs no JS. */
export function renderHomeMarkup({ hasProgress = false, hasResults = false } = {}) {
  const mark = `<span class="mark" aria-hidden="true">${markSVG()}</span>`;
  const roster = ['jett', 'phoenix', 'sage', 'sova', 'raze'].map(id => `<span class="mini-agent">${agentPortrait(id, { label: false, thumb: true })}</span>`).join('');
  return `<section class="home">
    <div class="hero"><div class="hero-copy">
      <div class="intro-note"><i aria-hidden="true"></i>无畏契约 · 全英雄人格档案</div>
      <h1>测测你最想像<br>无畏契约哪位英雄</h1>
      <p>枪法会骗人，选择不会。<br>24 个瞬间的选择，测出 ${AGENTS.length} 位英雄里最像你的那一位。</p>
      <div class="hero-cta"><button class="primary" data-action="${hasProgress ? 'continue' : 'start'}">${hasProgress ? '继续我的档案' : '开始测我的英雄'}${mark}</button>${hasProgress ? '<button class="text-button" data-action="restart">重新开始</button>' : ''}${hasResults ? '<button class="text-button" data-action="records">查看我的记录</button>' : ''}</div>
      <div class="hero-meta"><span><b>24</b> 道情境题</span><i aria-hidden="true"></i><span>大约 <b>4</b> 分钟</span><i aria-hidden="true"></i><span>不用登录</span></div>
      <p class="hero-credit">策划与文案：栗子</p>
    </div><div class="hero-art">${heroStack()}<div class="art-caption"><span></span>${AGENTS.length} 位英雄，等你认领<span></span></div></div></div>
    <div class="intro-strip"><div><span class="strip-icon" aria-hidden="true">✦</span><div><strong>按直觉选就好</strong>第一反应，通常最像你</div></div><div><span class="strip-icon" aria-hidden="true">◇</span><div><strong>领一张特工证</strong>定位、招牌技能、出没地图</div></div><div><span class="strip-icon" aria-hidden="true">↗</span><div><strong>喊搭子开黑</strong>保存小卡，看看你们能不能组队</div></div></div>
    <div class="home-bottom"><button class="mini-agents" data-action="gallery" aria-label="看看全部${AGENTS.length}位英雄档案">${roster}<span>${AGENTS.length} 位英雄，先偷偷看一眼 ↗</span></button><span>不是给你贴标签，是看看你会怎么打。</span></div>
  </section>`;
}
