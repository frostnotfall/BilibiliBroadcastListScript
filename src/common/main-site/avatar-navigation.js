import {isPageUrl} from '../urls.js';
  // 页面导航由页面脚本负责；保留头像原生处理器生成的 URL。
  export function createAvatarNavigation() {
    const events = new AbortController();
    let api = null, restoreIgnore = () => {}, active = null, timer = 0, restoreOpen = () => {};
    function destination(value) {
      try {
        const url = new URL(value, location.href);
        return isPageUrl(url) && url.hostname === 'space.bilibili.com' && /^\/\d+\/?$/.test(url.pathname) ? url : null;
      } catch { return null; }
    }
    function control(node) {
      const link = node instanceof Element ? node.closest('a') : null;
      return link && (link.closest('.header-avatar-wrap') && (link.matches('.header-entry-mini,.header-entry-avatar') || link.querySelector('.bili-avatar'))
        || link.closest('.link-navbar') && (link.querySelector('.user-avatar')
          || link.closest('.user-panel-ctnr,.user-panel') && link.textContent.trim() === '主站空间')
        || link.closest('.mini-header,.international-header') && link.querySelector('.i-face,.i_face')
        || link.closest('.charity-header') && link.matches('.user') && link.querySelector('.face')) ? link : null;
    }
    function isLink(link) { return Boolean(control(link) && link.hasAttribute('href') && destination(link.href)); }
    function ignored(url, {explicit = false} = {}) {
      if (explicit) return false;
      return Boolean(active && destination(url.href)) || Array.from(document.querySelectorAll('a[href]'))
        .some(link => isLink(link) && link.href === url.href);
    }
    function sync() {
      const next = window.__potPlayerBilibiliClick;
      if (next === api) return;
      restoreIgnore(); api = next;
      restoreIgnore = typeof api?.ignoreUrl === 'function' ? api.ignoreUrl(ignored) : () => {};
    }
    function clear() {
      clearTimeout(timer); timer = 0; active = null;
      restoreOpen(); restoreOpen = () => {};
    }
    function onClick(event) {
      sync(); clear();
      if (!event.isTrusted || event.button !== 0) return;
      const link = control(event.target);
      if (!link || link.hasAttribute('download')) return;
      const modified = event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
      if (isLink(link)) {
        if (!modified) { event.preventDefault(); event.stopImmediatePropagation(); location.assign(link.href); }
        return;
      }
      // 无 href 的直播卡片保留原生处理器，只在本次点击内转换其 window.open。
      if (link.hasAttribute('href')) return;
      active = link;
      const originalOpen = window.open;
      function open(...args) {
        const url = destination(args[0]);
        if (active === link && url && !modified) { location.assign(url.href); return null; }
        return Reflect.apply(originalOpen, this, args);
      }
      window.open = open;
      restoreOpen = () => { if (window.open === open) window.open = originalOpen; };
      timer = setTimeout(clear, 0);
    }
    window.addEventListener('pointerdown', sync, { capture:true, signal:events.signal });
    window.addEventListener('keydown', sync, { capture:true, signal:events.signal });
    window.addEventListener('click', onClick, { capture:true, signal:events.signal });
    sync();
    const poll = setInterval(sync, 500);
    return { isLink, destroy() { events.abort(); clearInterval(poll); clear(); restoreIgnore(); } };
  }
