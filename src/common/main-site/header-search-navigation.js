import {urlOf} from '../urls.js';
import {createHeaderSearchControls} from '../header-search-controls.js';
  // 保留原生搜索处理器生成的地址、关键词、默认词和来源参数。
  export function createHeaderSearchNavigation() {
    const events = new AbortController(), attributes = new Map();
    const searchControls = createHeaderSearchControls({signal:events.signal});
    const headers = '.bili-header__bar,.mini-header,.international-header,.bili-header-m,.bili-mini-header,.b-header,.link-navbar,.charity-header,.search-fixed-header';
    const components = '#nav-searchform,#nav_searchform,.center-search-container,.nav-search,.nav-search-box,.search-block,.search-bar-ctnr,.search-box,.search-container,.search-panel,.nav-search-panel,.search-input-wrap,.charity-header .search-input';
    const originalOpen = window.open;
    let api = null, restoreIgnore = () => {}, pending = null, stopped = false;

    function searchControl(node) {
      if (node instanceof Element && node.closest('.broadcast-search-close')) return null;
      const component = node instanceof Element ? node.closest(components) : null;
      return component?.closest(headers) ? component : null;
    }
    function ignored(url) {
      return Boolean(pending?.component.isConnected && ['http:', 'https:'].includes(url.protocol));
    }
    function sync() {
      const next = window.__potPlayerBilibiliClick;
      if (next === api) return;
      restoreIgnore(); api = next;
      restoreIgnore = typeof api?.ignoreUrl === 'function' ? api.ignoreUrl(ignored) : () => {};
    }
    function prepare(event) {
      sync(); pending = null;
      if (!event.isTrusted || event.isComposing || event.keyCode === 229) return;
      const component = searchControl(event.target);
      if (!component) return;
      if (event.target.closest('a[download]')) return;
      if (event.type === 'pointerdown' && event.button !== 0) return;
      if (event.type === 'keydown' && event.key !== 'Enter' && !(event.key === ' ' && event.target.matches('button,[role="button"]'))) return;
      if (['pointerdown', 'click'].includes(event.type) && event.target.matches('input,textarea')) return;
      pending = { component, modified:event.ctrlKey || event.metaKey || event.shiftKey || event.altKey };
    }
    function open(...args) {
      const url = urlOf(args[0]), action = pending;
      if (!stopped && action?.component.isConnected && url) {
        if (!action.modified) { pending = null; location.assign(url.href); return null; }
        try { return Reflect.apply(originalOpen, this, args); }
        finally { pending = null; }
      }
      return Reflect.apply(originalOpen, this, args);
    }
    function onClick(event) {
      prepare(event);
      if (event.button !== 0 || !pending) return;
      const link = event.target.closest('a[href]');
      const url = link && !link.hasAttribute('download') ? urlOf(link.getAttribute('href')) : null;
      if (url && !pending.modified) {
        pending = null; event.preventDefault(); event.stopImmediatePropagation(); location.assign(url.href);
      }
      // 无 href 的建议项和搜索按钮继续运行原生处理器，包括异步搜索历史写入。
    }
    function self(element, name) {
      if (!element || element.getAttribute(name) === '_self') return;
      if (!attributes.has(element)) attributes.set(element, new Map());
      const saved = attributes.get(element);
      if (!saved.has(name)) saved.set(name, element.getAttribute(name));
      element.setAttribute(name, '_self');
    }
    function onSubmit(event) {
      prepare(event);
      if (!pending) return;
      self(event.target, 'target');
      if (event.submitter?.hasAttribute('formtarget')) self(event.submitter, 'formtarget');
    }
    window.open = open;
    window.addEventListener('pointerdown', prepare, { capture:true, signal:events.signal });
    window.addEventListener('keydown', prepare, { capture:true, signal:events.signal });
    window.addEventListener('click', onClick, { capture:true, signal:events.signal });
    window.addEventListener('submit', onSubmit, { capture:true, signal:events.signal });
    window.addEventListener('focusin', event => { if (!searchControl(event.target)) pending = null; }, { capture:true, signal:events.signal });
    sync();
    const poll = setInterval(sync, 500);
    return { destroy() {
      stopped = true; pending = null; events.abort(); clearInterval(poll); restoreIgnore();
      searchControls.destroy();
      if (window.open === open) window.open = originalOpen;
      for (const [element, saved] of attributes) for (const [name, value] of saved) {
        if (element.getAttribute(name) !== '_self') continue;
        if (value === null) element.removeAttribute(name); else element.setAttribute(name, value);
      }
      attributes.clear();
    } };
  }
