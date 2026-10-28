/**
 * 离线缓存与版本更新提示。
 *
 * 只在正式构建里启用：`prepare-release` 会往 index.html 注入
 * `<meta name="puppy-build-version">`，而直接打开 dist 的开发预览没有这个标记，
 * 因此开发时不会留下一个半成品 Service Worker。
 *
 * 更新策略：新版本先安静地装好，由页面底部的小条提示，用户点「更新」才
 * 通知等待中的 worker 接管并刷新，避免答题途中被强制跳转。
 */

const VERSION_SELECTOR = 'meta[name="puppy-build-version"]';
const VERSION_PATTERN = /^[a-f0-9]{64}$/;
const UPDATE_CHECK_INTERVAL = 10 * 60 * 1000;

export function isReleaseBuild(doc) {
  const meta = doc?.querySelector?.(VERSION_SELECTOR);
  return VERSION_PATTERN.test(meta?.getAttribute?.('content') || '');
}

export function setupPwa({ win, doc, nav } = {}) {
  if (!win || !doc || !nav?.serviceWorker) return null;
  if (!isReleaseBuild(doc)) return null;

  const workers = nav.serviceWorker;
  const banner = doc.getElementById('update-banner');
  const applyButton = doc.getElementById('apply-update');
  const dismissButton = doc.getElementById('dismiss-update');
  const offlineStatus = doc.getElementById('offline-status');

  let registration = null;
  let reloading = false;
  let dismissed = false;
  let lastUpdateCheck = Date.now();

  const hideBanner = () => { if (banner) banner.hidden = true; };
  const showBanner = () => { if (banner && !dismissed) banner.hidden = false; };

  // 只有已有一个受控页面时，等待中的 worker 才是「更新」而不是首次安装。
  const offerUpdate = () => {
    if (!registration?.waiting || !workers.controller) return;
    showBanner();
  };

  const watch = value => {
    registration = value;
    offerUpdate();
    value.addEventListener?.('updatefound', () => {
      const installing = value.installing;
      if (!installing) return;
      installing.addEventListener?.('statechange', () => {
        if (installing.state === 'installed') offerUpdate();
      });
    });
  };

  const syncOffline = () => {
    if (!offlineStatus) return;
    offlineStatus.textContent = nav.onLine === false ? '当前离线，已安装的页面仍可继续答题。' : '';
  };

  if (applyButton) {
    applyButton.addEventListener('click', () => {
      const waiting = registration?.waiting;
      if (!waiting) { hideBanner(); return; }
      // 刷新只由 controllerchange 触发一次，避免重复 reload。
      reloading = true;
      hideBanner();
      waiting.postMessage({ type: 'SKIP_WAITING' });
    });
  }
  if (dismissButton) {
    dismissButton.addEventListener('click', () => {
      dismissed = true;
      hideBanner();
    });
  }

  workers.addEventListener('controllerchange', () => {
    if (!reloading) return;
    reloading = false;
    win.location.reload();
  });

  win.addEventListener('online', syncOffline);
  win.addEventListener('offline', syncOffline);
  win.addEventListener('visibilitychange', () => {
    if (doc.visibilityState !== 'visible') return;
    if (Date.now() - lastUpdateCheck < UPDATE_CHECK_INTERVAL) return;
    lastUpdateCheck = Date.now();
    registration?.update?.().catch(() => {});
  });
  syncOffline();

  workers.register('./sw.js', { scope: './', updateViaCache: 'none' }).then(watch, () => {
    // 非安全上下文、隐私模式或站点禁止注册时保持静默：测试本身不依赖离线能力。
  });
  return { offerUpdate };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && typeof navigator !== 'undefined') {
  const start = () => setupPwa({ win: window, doc: document, nav: navigator });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
