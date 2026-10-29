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
  // Lucide Link (derived from Feather); licenses in THIRD_PARTY_NOTICES.md.
  link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  // Official video-page .video-watchlater-icon; provenance in THIRD_PARTY_NOTICES.md.
  watchlater:'<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.5 4C7.08172 4 3.5 7.58172 3.5 12C3.5 16.4183 7.08172 20 11.5 20C13.709 20 15.7072 19.106 17.156 17.6578C17.5465 17.2673 18.1797 17.2674 18.5702 17.658C18.9606 18.0486 18.9605 18.6817 18.5699 19.0722C16.7615 20.8801 14.2606 22 11.5 22C5.97715 22 1.5 17.5228 1.5 12C1.5 6.47715 5.97715 2 11.5 2C17.0228 2 21.5 6.47715 21.5 12C21.5 12.3748 21.4793 12.7451 21.439 13.1099C21.3783 13.6588 20.8841 14.0546 20.3352 13.9939C19.7863 13.9333 19.3904 13.4391 19.4511 12.8901C19.4834 12.5982 19.5 12.3012 19.5 12C19.5 7.58172 15.9183 4 11.5 4Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M17.7929 10.7929C18.1834 10.4024 18.8166 10.4024 19.2071 10.7929L20.5 12.0858L21.7929 10.7929C22.1834 10.4024 22.8166 10.4024 23.2071 10.7929C23.5976 11.1834 23.5976 11.8166 23.2071 12.2071L21.2071 14.2071C21.0196 14.3946 20.7652 14.5 20.5 14.5C20.2348 14.5 19.9804 14.3946 19.7929 14.2071L17.7929 12.2071C17.4024 11.8166 17.4024 11.1834 17.7929 10.7929Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M14.625 10.4846C15.7917 11.1582 15.7917 12.8422 14.625 13.5157L10.875 15.6808C9.70834 16.3544 8.25 15.5124 8.25 14.1653L8.25 9.83513C8.25 8.48798 9.70834 7.64601 10.875 8.31959L14.625 10.4846ZM13.875 12.2167C14.0417 12.1205 14.0417 11.8799 13.875 11.7837L10.125 9.61862C9.95833 9.5224 9.75 9.64268 9.75 9.83513L9.75 14.1653C9.75 14.3577 9.95833 14.478 10.125 14.3818L13.875 12.2167Z"/></svg>',
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
export function createMediaMenu({getTarget, openPage, play, openNew, openExternal, addNext, addLast, addWatchlater}) {
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
    const external = {label:'从外部浏览器打开', icon:'browser', action:openExternal};
    const copy = {label:'复制链接地址', icon:'link', copy:true};
    if (target.kind === 'page') {
      const items = [
        {label:'在当前标签页打开该页面', hint:'(鼠标左键)', icon:'bilibili', action:openPage}, external,
      ];
      if (target.playlist) items.push(
        {label:'播放该页面内视频', icon:'player', action:play},
        {label:'新开一个进程播放该页面内视频', hint:'(鼠标中键)', icon:'player', action:openNew}, null,
        {label:'将该页面内视频添加到默认播放列表（下一个）', icon:'playlist', action:addNext},
        {label:'将该页面内视频添加到默认播放列表（末尾）', icon:'playlist', action:addLast},
      );
      return [...items, null, copy];
    }
    return [
      {label:'使用当前进程播放', hint:'(鼠标左键)', icon:'player', action:play},
      {label:'新开一个进程播放', hint:'(鼠标中键)', icon:'player', action:openNew}, null,
      {label:'添加到默认播放列表（下一个）', icon:'playlist', action:addNext},
      {label:'添加到默认播放列表（末尾）', icon:'playlist', action:addLast}, null, external, copy,
      ...(target.watchlater ? [{label:'添加到稍后再看', icon:'watchlater', watchlater:true}] : []),
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
        if (item.watchlater) {
          if (button.disabled) return;
          const current = host;
          button.disabled = true; button.setAttribute('aria-busy', 'true');
          status.textContent = '正在添加到稍后再看…'; place();
          try {
            await addWatchlater(target);
            if (host === current) { status.textContent = '已添加到稍后再看'; place(); }
          } catch (error) {
            if (host === current) { button.disabled = false; status.textContent = error.message; place(); }
          } finally { button.removeAttribute('aria-busy'); }
        } else if (item.copy) {
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
        const enabled = buttons.filter(button => !button.disabled);
        const index = enabled.indexOf(root.activeElement);
        enabled[event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length]?.focus();
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
