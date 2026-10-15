import navigationStyle from './navigation-bar.css';

const height = 32;
const headers = '.bili-header__bar,.mini-header,.international-header,.bili-header-m,.bili-mini-header,.b-header,.link-navbar,.charity-header,.search-fixed-header,.header-channel,.space-navbar,#app .timeline-header,.v-popover:has(.bili-header-channel-panel)';
const icons = {
  back:'m12 5-7 7 7 7M5 12h15',
  forward:'m12 5 7 7-7 7M4 12h15',
  home:'m3 10 9-7 9 7M5 9v11h5v-7h4v7h5V9',
  reload:'M20 11a8 8 0 1 0-2 6M20 4v7h-7',
  submit:'M20 5v8H5m5-5-5 5 5 5',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name]}"/></svg>`;

// Explicitly mounted by the dispatcher after the page UI, never at import time.
export function mountNavigationBar() {
  const html = document.documentElement;
  const events = new AbortController();
  const offsets = new Map();
  const media = matchMedia('(prefers-color-scheme: dark)');
  let stopped = false, editing = false, frame = 0, layoutDirty = true, actionMode = '';
  const padding = getComputedStyle(html).paddingTop;
  const scrollPadding = parseFloat(getComputedStyle(html).scrollPaddingTop) || 0;
  const style = document.createElement('style');
  style.id = 'broadcast-navigation-style';
  // Extra specificity keeps Follow's shell reset from removing our document inset.
  style.textContent = `html.broadcast-navigation-active.broadcast-navigation-active {
    --broadcast-navigation-height:${height}px;
    padding-top:calc(${padding} + ${height}px)!important;
    scroll-padding-top:${scrollPadding + height}px!important;
  }`;
  const host = document.createElement('div');
  host.id = 'broadcast-navigation';
  host.style.cssText = `all:initial!important;display:block!important;position:fixed!important;top:0!important;left:0!important;right:0!important;width:auto!important;height:${height}px!important;z-index:2147483647!important;`;
  const root = host.attachShadow({mode:'open'});
  root.innerHTML = `<style>${navigationStyle}</style><nav aria-label="页面导航">
    <button type="button" data-action="back" title="后退" aria-label="后退">${icon('back')}</button>
    <button type="button" data-action="forward" title="前进" aria-label="前进">${icon('forward')}</button>
    <button type="button" data-action="home" title="首页" aria-label="首页">${icon('home')}</button>
    <input type="text" aria-label="地址栏" spellcheck="false" autocomplete="off" />
    <button type="button" data-action="action" title="刷新" aria-label="刷新">${icon('reload')}</button>
  </nav>`;
  const address = root.querySelector('input');
  const action = root.querySelector('[data-action="action"]');
  const back = root.querySelector('[data-action="back"]');
  const forward = root.querySelector('[data-action="forward"]');

  function updateAddress() {
    const mode = editing ? 'submit' : 'reload';
    if (mode !== actionMode) {
      actionMode = mode;
      action.innerHTML = icon(mode);
      action.title = editing ? '打开网址' : '刷新';
      action.setAttribute('aria-label', editing ? '回车' : '刷新');
    }
    if (editing) return;
    const title = document.title.trim() || location.href;
    if (address.value !== title) address.value = title;
    address.title = `${title}\n${location.href}`;
  }
  function submitAddress() {
    if (!address.value.trim()) { address.blur(); return; }
    let value = address.value.trim();
    if (!/^[a-z][a-z\d+.-]*:/i.test(value) || /^[^/?#:\s]+:\d+(?:[/?#]|$)/.test(value)) value = 'https://' + value;
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error('Invalid URL');
      address.setCustomValidity('');
      location.assign(url.href);
    } catch {
      address.setCustomValidity('请输入有效的 HTTP 或 HTTPS 网址');
      address.reportValidity();
    }
  }
  function updateTheme() {
    // Native Bilibili stylesheet/class takes precedence over optional host hints.
    const sheet = document.querySelector('link#__css-map__')?.getAttribute('href') || '';
    const marker = (html.getAttribute('data-theme') || html.getAttribute('lab-style') || '').toLowerCase();
    const scheme = getComputedStyle(html).colorScheme;
    let dark;
    if (sheet.includes('/dark.css')) dark = true;
    else if (sheet.includes('/light.css')) dark = false;
    else if (html.classList.contains('bili_dark')) dark = true;
    else if (marker.includes('dark')) dark = true;
    else if (marker.includes('light')) dark = false;
    else if (scheme === 'dark' || scheme === 'light') dark = scheme === 'dark';
    else {
      for (const element of [document.body, html]) {
        const rgb = getComputedStyle(element).backgroundColor.match(/[\d.]+/g);
        if (rgb?.length >= 3 && (rgb.length < 4 || Number(rgb[3]) === 1)) {
          dark = Number(rgb[0]) * .2126 + Number(rgb[1]) * .7152 + Number(rgb[2]) * .0722 < 128;
          break;
        }
      }
      dark ??= media.matches;
    }
    const theme = dark ? 'dark' : 'light';
    if (host.dataset.theme !== theme) host.dataset.theme = theme;
  }
  function restoreTop(element, state) {
    if (element.style.getPropertyValue('top') !== state.applied || element.style.getPropertyPriority('top') !== 'important') return;
    if (state.original) element.style.setProperty('top', state.original, state.priority);
    else element.style.removeProperty('top');
  }
  function updateLayout() {
    layoutDirty = false;
    // Feed's sticky shell uses the shared height variable in its own layout.
    const targets = new Set([...document.querySelectorAll(headers)].filter(element => !element.matches('.feedscript-header')));
    for (const [element, state] of offsets) if (!targets.has(element) || !element.isConnected) {
      restoreTop(element, state); offsets.delete(element);
    }
    for (const element of targets) {
      const saved = offsets.get(element);
      if (saved) { restoreTop(element, saved); offsets.delete(element); }
      const computed = getComputedStyle(element);
      if (!['fixed', 'sticky'].includes(computed.position) || computed.top === 'auto') continue;
      const state = {original:element.style.getPropertyValue('top'), priority:element.style.getPropertyPriority('top'), applied:''};
      element.style.setProperty('top', `calc(${computed.top} + ${height}px)`, 'important');
      state.applied = element.style.getPropertyValue('top');
      state.appliedStyle = element.getAttribute('style');
      offsets.set(element, state);
    }
  }
  function sync() {
    if (stopped) return;
    if (!style.isConnected) { document.head.append(style); layoutDirty = true; }
    updateAddress(); updateTheme();
    // History.length has no current index; Navigation API entries can omit
    // cross-origin history. Do not disable a valid cross-origin Back/Forward.
    back.disabled = forward.disabled = history.length <= 1;
    if (layoutDirty) updateLayout();
    if (!host.isConnected) document.body.append(host);
  }
  function schedule(layout = false) {
    if (stopped) return;
    layoutDirty ||= layout;
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; sync(); });
  }
  address.addEventListener('focus', () => {
    editing = true; address.value = location.href; address.title = '输入网址，Enter 跳转，Esc 取消';
    address.setCustomValidity(''); updateAddress(); address.select();
  }, {signal:events.signal});
  address.addEventListener('blur', () => {
    editing = false; address.setCustomValidity(''); updateAddress();
  }, {signal:events.signal});
  address.addEventListener('input', () => address.setCustomValidity(''), {signal:events.signal});
  root.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.target !== address || event.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter') { event.preventDefault(); submitAddress(); }
    else if (event.key === 'Escape') { event.preventDefault(); address.blur(); }
  }, {signal:events.signal});
  // Keep the address focused until its draft is submitted with the right button.
  action.addEventListener('pointerdown', event => { if (editing) event.preventDefault(); }, {signal:events.signal});
  root.addEventListener('click', event => {
    event.stopPropagation();
    const button = event.target.closest?.('button');
    if (!button || button.disabled) return;
    switch (button.dataset.action) {
      case 'back': history.back(); break;
      case 'forward': history.forward(); break;
      case 'home': location.assign('https://www.bilibili.com/'); break;
      case 'action': if (editing) submitAddress(); else location.reload(); break;
    }
  }, {signal:events.signal});
  const observer = new MutationObserver(records => {
    let changed = false, layout = false;
    for (const record of records) {
      const target = record.target;
      if (record.type === 'attributes') {
        if (target === html || target === document.body || target.matches?.('link,style')) {
          changed = true; layout = true;
        } else if (target.matches?.(headers) || offsets.has(target) || target.querySelector?.(headers)) {
          // The home banner toggles an ancestor class on scroll. Its child bar
          // switches absolute/fixed without changing its own class or style.
          // Re-read native positioning so the fixed inset is also removed when
          // the bar returns inside the already-inset banner.
          const saved = offsets.get(target);
          if (record.attributeName === 'style' && saved && target.getAttribute('style') === saved.appliedStyle) continue;
          changed = true; layout = true;
        }
      } else if (document.head.contains(target)) { changed = true; layout = true; }
      else if (record.type === 'childList') for (const node of [...record.addedNodes, ...record.removedNodes]) {
        if (node.nodeType === 1 && (offsets.has(node) || node.matches(headers) || node.querySelector(headers))) { changed = true; layout = true; }
      }
    }
    if (changed) schedule(layout);
  });
  document.head.append(style);
  html.classList.add('broadcast-navigation-active');
  document.body.append(host);
  observer.observe(html, {subtree:true, childList:true, characterData:true, attributes:true,
    attributeFilter:['class', 'style', 'href', 'data-theme', 'lab-style']});
  window.addEventListener('resize', () => schedule(true), {signal:events.signal});
  window.addEventListener('load', () => schedule(true), {capture:true, signal:events.signal});
  media.addEventListener('change', () => schedule(), {signal:events.signal});
  sync();
  return {
    sync,
    routeChanged() { schedule(true); },
    destroy() {
      if (stopped) return;
      stopped = true; events.abort(); observer.disconnect(); cancelAnimationFrame(frame);
      for (const [element, state] of offsets) restoreTop(element, state);
      offsets.clear(); host.remove(); style.remove(); html.classList.remove('broadcast-navigation-active');
    },
  };
}
