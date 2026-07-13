// Bitcoin1070 PRO v6.1 - common app shell
(() => {
  const page = location.pathname.split('/').pop() || 'index.html';
  const pageGroup = page === 'portfolio-edit.html' ? 'portfolio.html' : page === 'analysis.html' ? 'market.html' : page;

  function setActiveNav() {
    document.querySelectorAll('.bottom-nav a').forEach(link => {
      const href = (link.getAttribute('href') || '').split('#')[0];
      const active = href === pageGroup;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function addBackButton() {
    if (!['portfolio-edit.html', 'analysis.html'].includes(page)) return;
    const header = document.querySelector('.app-header');
    if (!header || header.querySelector('.smart-back-button')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'smart-back-button';
    button.textContent = '← 戻る';
    button.addEventListener('click', () => {
      if (history.length > 1) history.back();
      else location.href = page === 'portfolio-edit.html' ? 'portfolio.html' : 'market.html';
    });
    header.prepend(button);
  }

  function restoreScroll() {
    const key = `btc1070_scroll_${page}`;
    const saved = Number(sessionStorage.getItem(key) || 0);
    if (saved > 0) requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: 'auto' }));
    let timer;
    window.addEventListener('scroll', () => {
      clearTimeout(timer);
      timer = setTimeout(() => sessionStorage.setItem(key, String(window.scrollY)), 120);
    }, { passive: true });
  }

  function setupNetworkStatus() {
    const banner = document.createElement('div');
    banner.className = 'network-banner hidden';
    banner.setAttribute('role', 'status');
    banner.textContent = 'オフラインです。保存済みデータを表示しています。';
    document.body.appendChild(banner);
    const refresh = () => banner.classList.toggle('hidden', navigator.onLine);
    addEventListener('online', refresh);
    addEventListener('offline', refresh);
    refresh();
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./service-worker.js');
        registration.update().catch(() => {});
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setActiveNav();
    addBackButton();
    restoreScroll();
    setupNetworkStatus();
  });
  registerServiceWorker();
})();
