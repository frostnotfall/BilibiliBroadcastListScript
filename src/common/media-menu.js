import css from './media-menu.css';
import playerIcon from './assets/potplayer/potplayer-app-16.png';
import playlistIcon from './assets/potplayer/playlist-dpl-16.png';
import bilibiliIcon from './assets/bilibili/bilibili.ico';

// esbuild embeds the selected native icons in the single-file script.
const icons = {
  bilibili:`<img src="${bilibiliIcon}" width="16" height="16" alt="" />`,
  player:`<img src="${playerIcon}" width="16" height="16" alt="" />`,
  playlist:`<img src="${playlistIcon}" width="16" height="16" alt="" />`,
  browser:'<svg viewBox="0 0 20 20" fill="none" stroke="#3199dc" stroke-width="1.4"><circle cx="10" cy="10" r="8"/><ellipse cx="10" cy="10" rx="3.7" ry="8"/><path d="M2 10h16M3.5 5.5h13M3.5 14.5h13"/></svg>',
};

function pageTheme(media) {
  const navigation = document.getElementById('broadcast-navigation');
  if (['dark','light'].includes(navigation?.dataset.theme)) return navigation.dataset.theme;
  const html = document.documentElement;
  const sheet = document.querySelector('link#__css-map__')?.getAttribute('href') || '';
  const marker = (html.getAttribute('data-theme') || html.getAttribute('lab-style') || '').toLowerCase();
  if (sheet.includes('/dark.css')) return 'dark';
  if (sheet.includes('/light.css')) return 'light';
  if (html.classList.contains('bili_dark') || marker.includes('dark')) return 'dark';
  if (marker.includes('light')) return 'light';
  const scheme = getComputedStyle(html).colorScheme;
  return ['dark','light'].includes(scheme) ? scheme : media.matches ? 'dark' : 'light';
}

async function copyLink(value) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return; }
  } catch { /* Older/permission-limited WebViews can still allow native copy. */ }
  let focused = document.activeElement;
  while (focused?.shadowRoot?.activeElement) focused = focused.shadowRoot.activeElement;
  const selection = getSelection();
  const ranges = selection ? Array.from({length:selection.rangeCount}, (_, i) => selection.getRangeAt(i).cloneRange()) : [];
  const input = document.createElement('textarea'); input.value = value; input.readOnly = true;
  input.style.cssText = 'position:fixed;left:-10000px;top:0;'; document.body.append(input);
  try { input.select(); if (!document.execCommand('copy')) throw new Error('Copy denied'); }
  finally {
    input.remove(); if (focused?.isConnected) focused.focus({preventScroll:true});
    if (selection) { selection.removeAllRanges(); for (const range of ranges) selection.addRange(range); }
  }
}

// One delegated listener covers dynamic cards and open shadow roots. The owner
// supplies the same link eligibility and playback rules as its normal clicks.
export function createMediaMenu({getTarget, openPage, play, openNew, openExternal, addNext, addLast}) {
  const events = new AbortController();
  const media = matchMedia('(prefers-color-scheme: dark)');
  let host = null, previousFocus = null, menuEvents = null, themeObserver = null, stopped = false;
  const scrollPositions = new Map();
  let dialogHost = null, dialogEvents = null, dialogFocus = null;
  function syncTheme() {
    if (!host && !dialogHost) return;
    const theme = pageTheme(media);
    for (const element of [host, dialogHost]) if (element && element.dataset.theme !== theme) element.dataset.theme = theme;
  }
  function watchTheme() {
    themeObserver?.disconnect();
    themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(document.documentElement, {attributes:true, attributeFilter:['class','style','data-theme','lab-style']});
    if (document.head) themeObserver.observe(document.head, {childList:true, subtree:true, attributes:true, attributeFilter:['href']});
    const navigation = document.getElementById('broadcast-navigation');
    if (navigation) themeObserver.observe(navigation, {attributes:true, attributeFilter:['data-theme']});
    syncTheme();
  }
  function releaseTheme() {
    if (host || dialogHost) return;
    themeObserver?.disconnect(); themeObserver = null;
  }
  function close(restoreFocus = false) {
    const focused = host?.shadowRoot?.activeElement;
    menuEvents?.abort(); menuEvents = null;
    host?.remove(); host = null;
    scrollPositions.clear();
    releaseTheme();
    if (restoreFocus && focused && previousFocus?.isConnected) previousFocus.focus({preventScroll:true});
    previousFocus = null;
  }
  function closeDialog(restoreFocus = false) {
    dialogEvents?.abort(); dialogEvents = null;
    dialogHost?.shadowRoot.querySelector('dialog')?.close();
    dialogHost?.remove(); dialogHost = null;
    releaseTheme();
    if (restoreFocus && dialogFocus?.isConnected) dialogFocus.focus({preventScroll:true});
    dialogFocus = null;
  }
  function confirmExternal(url) {
    if (stopped || !document.body) return false;
    // A single modal consumes duplicate site handlers for the same click.
    if (dialogHost) return true;
    close(true);
    dialogFocus = document.activeElement;
    dialogHost = document.createElement('div'); dialogHost.id = 'broadcast-external-dialog';
    const root = dialogHost.attachShadow({mode:'open'});
    const style = document.createElement('style'); style.textContent = css;
    const dialog = document.createElement('dialog'); dialog.setAttribute('aria-labelledby','external-question');
    const message = document.createElement('p'); message.id = 'external-question';
    message.textContent = '不支持此页面，是否从外置浏览器打开？';
    const actions = document.createElement('div'); actions.className = 'dialog-actions';
    dialogEvents = new AbortController();
    for (const [label, accepted] of [['是',true],['否',false]]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.addEventListener('click', event => {
        if (!event.isTrusted || event.button !== 0) return;
        event.preventDefault(); event.stopPropagation(); closeDialog(true);
        if (accepted) openExternal({url});
      }, {signal:dialogEvents.signal});
      actions.append(button);
    }
    dialog.addEventListener('cancel', event => {event.preventDefault(); closeDialog(true);}, {signal:dialogEvents.signal});
    // Prevent page click handlers (including the window.open wrapper) from
    // interpreting dialog buttons as another navigation request.
    root.addEventListener('click', event => event.stopPropagation(), {signal:dialogEvents.signal});
    dialog.append(message,actions); root.append(style,dialog); document.body.append(dialogHost); watchTheme();
    try { dialog.showModal(); return true; }
    catch { closeDialog(true); return false; }
  }
  function itemsFor(target) {
    if (target.kind === 'native') return [
      {label:'不支持当前页面，从外置浏览器打开', action:openExternal},
    ];
    const external = {label:'从外部浏览器打开', hint:'(鼠标中键)', icon:'browser', action:openExternal};
    const copy = {label:'复制链接地址', copy:true};
    if (target.kind === 'page') {
      const items = [
        {label:'在当前标签页打开该页面', hint:'(鼠标左键)', icon:'bilibili', action:openPage}, external,
      ];
      if (target.playlist) items.push(
        {label:'播放该页面内视频', icon:'player', action:play},
        {label:'新开一个进程播放该页面内视频', icon:'player', action:openNew}, null,
        {label:'将该页面内视频添加到默认播放列表（下一个）', icon:'playlist', action:addNext},
        {label:'将该页面内视频添加到默认播放列表（末尾）', icon:'playlist', action:addLast},
      );
      return [...items, null, copy];
    }
    return [
      {label:'使用当前进程播放', hint:'(鼠标左键)', icon:'player', action:play},
      {label:'新开一个进程播放', icon:'player', action:openNew}, external, null,
      {label:'添加到默认播放列表（下一个）', icon:'playlist', action:addNext},
      {label:'添加到默认播放列表（末尾）', icon:'playlist', action:addLast}, null, copy,
    ];
  }
  function onContextMenu(event) {
    if (stopped || !event.isTrusted || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    close();
    const target = getTarget(event);
    if (!target || !document.body || dialogHost) return;
    event.preventDefault(); event.stopImmediatePropagation();
    // Only scrolling an ancestor moves the menu's target. Native live banners
    // also scroll their own overflow-hidden contents during animation; those
    // unrelated events must not dismiss another card's menu. Snapshot offsets
    // to ignore scroll-into-view events already queued before contextmenu.
    const path = event.composedPath();
    // composedPath also includes ancestors outside an open shadow root.
    for (const node of new Set([...path.slice(path.indexOf(target.anchor) + 1), document.scrollingElement])) {
      if (node instanceof Element && node !== target.anchor) scrollPositions.set(node, [node.scrollLeft, node.scrollTop]);
    }
    previousFocus = document.activeElement;
    menuEvents = new AbortController();
    host = document.createElement('div'); host.id = 'broadcast-media-menu';
    const root = host.attachShadow({mode:'open'});
    const style = document.createElement('style'); style.textContent = css;
    const menu = document.createElement('div'); menu.setAttribute('role','menu'); menu.setAttribute('aria-label','媒体打开方式');
    const status = document.createElement('div'); status.className = 'copy-status'; status.setAttribute('role','status');
    function place() {
      const bounds = host.getBoundingClientRect(), anchorBounds = target.anchor.getBoundingClientRect();
      const x = event.clientX || anchorBounds.left, y = event.clientY || anchorBounds.bottom;
      host.style.left = Math.max(6, Math.min(x, innerWidth - bounds.width - 6)) + 'px';
      host.style.top = Math.max(6, Math.min(y, innerHeight - bounds.height - 6)) + 'px';
    }
    const buttons = [];
    for (const item of itemsFor(target)) {
      if (!item) { const separator = document.createElement('div'); separator.setAttribute('role','separator'); menu.append(separator); continue; }
      const button = document.createElement('button'); button.type = 'button'; button.setAttribute('role','menuitem');
      button.setAttribute('aria-label', item.label + (item.hint || ''));
      const image = document.createElement('span'); image.className = 'icon'; image.setAttribute('aria-hidden','true'); image.innerHTML = icons[item.icon] || '';
      const label = document.createElement('span'); label.className = 'label'; label.textContent = item.label;
      if (item.hint) { const hint = document.createElement('span'); hint.className = 'hint'; hint.textContent = item.hint; label.append(hint); }
      button.append(image,label);
      button.addEventListener('click', async event => {
        if (!event.isTrusted || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); event.stopPropagation();
        if (item.copy) {
          const current = host;
          try { await copyLink(target.url); if (host === current) close(true); }
          catch { if (host === current) { status.textContent = '复制失败，请重试'; place(); } }
        } else { close(true); item.action(target); }
      }, {signal:menuEvents.signal});
      menu.append(button); buttons.push(button);
    }
    menu.append(status); root.append(style,menu); document.body.append(host); watchTheme();
    place();
    root.addEventListener('keydown', event => {
      if (event.key === 'Escape') {event.preventDefault(); close(true);}
      else if (event.key === 'Tab') close();
      else if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
        event.preventDefault();
        const index = buttons.indexOf(root.activeElement);
        buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length].focus();
      }
    }, {signal:menuEvents.signal});
    buttons[0].focus({preventScroll:true});
  }
  document.addEventListener('contextmenu', onContextMenu, {capture:true, signal:events.signal});
  document.addEventListener('pointerdown', event => {if (host && !event.composedPath().includes(host)) close();}, {capture:true, signal:events.signal});
  document.addEventListener('scroll', event => {
    if (!host || event.composedPath().includes(host)) return;
    const node = event.target === document ? document.scrollingElement : event.target;
    const position = scrollPositions.get(node);
    if (!position || node.scrollLeft === position[0] && node.scrollTop === position[1]) return;
    close();
  }, {capture:true, signal:events.signal});
  window.addEventListener('resize', () => close(), {signal:events.signal});
  window.addEventListener('blur', () => close(), {signal:events.signal});
  media.addEventListener('change', syncTheme, {signal:events.signal});
  return {confirmExternal, destroy() {if (stopped) return; stopped = true; events.abort(); close(); closeDialog();}};
}
