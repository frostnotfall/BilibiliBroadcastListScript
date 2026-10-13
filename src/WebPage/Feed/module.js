import {createDynamicContent, dynamicContentStyle, dynamicSelectors} from '../../common/dynamic-content.js';
import {pageId, isPageUrl, isMediaUrl, createPageOpening} from '../../common/index.js';
import {createHeaderSearchNavigation, createAvatarNavigation} from '../../common/main-site/home-navigation.js';
export const early = () => createPageOpening();
export function mount() {
  'use strict';
  const matchesPage = () => pageId(location.href) === 'Feed';
  if (!matchesPage()) return;
  window.bilibiliFeedScript?.destroy();

  const headerSearchNavigation = createHeaderSearchNavigation();

  const avatarNavigation = createAvatarNavigation();

  const html = document.documentElement;
  const narrow = matchMedia('(width < 1100px)'); // 官方三列布局所需空间不足时，启用附加布局。
  const railWidth = 20; // 左侧开合条宽度。
  const railDeadZone = 5; // 最左侧不响应鼠标的宽度。
  const leftWidth = `min(280px,calc(100vw - ${railWidth + 20}px))`;
  const profile = 'bili-user-profile,.bili-user-profile';
  const popup = `${profile},[role="tooltip"],[role="dialog"],[class*="popover"],[class*="popper"],[class*="image-viewer"],[class*="image-preview"]`;
  const pageChild = `:not(:is(${popup})):not(:has(${profile}))`;
  const header = '#biliMainHeader,#bili-header-container,#bili-header,.b-header,.bili-header,.bili-header-m,.bili-mini-header,.header-v3,.international-header,.bili-header__bar,.bili-dyn-home__header';
  const extra = 'aside.right,.bili-dyn-sidebar,.bili-dyn-search-trendings,.bili-dyn-banner,.bg,.bgc';
  const {content,fullWidth} = dynamicSelectors;
  let classes = new Map();
  const events = new AbortController();
  const profileCSS = 'left:var(--feedscript-profile-left)!important; top:var(--feedscript-profile-top)!important; zoom:var(--feedscript-profile-zoom)!important; transition-property:left,top,opacity!important;';
  const profiles = new Map(), avatarMenus = new Map();
  const avatarProperties = ['--feedscript-avatar-left','--feedscript-avatar-top','--feedscript-avatar-zoom'];
  const homeEntry = '.home-page-panel-entry';
  let homeClick = null, homeClickTimer = 0, potPlayerApi = null, restoreIgnore = () => {};
  let main = null, left = null, open = false, stopped = false, frame = 0, layoutPending = false, width = 0;
  let restoreViewport = null, restoreLeft = null;
  const dynamicContent = createDynamicContent({getRoot:() => main,popup,isActive:() => narrow.matches});
  const style = Object.assign(document.createElement('style'),{ id:'feedscript-style' });
  const rail = Object.assign(document.createElement('div'),{ id:'feedscript-rail' });
  const button = Object.assign(document.createElement('button'),{ id:'feedscript-toggle', type:'button' });
  const close = Object.assign(document.createElement('button'),{ id:'feedscript-close', type:'button', textContent:'×', title:'收起左侧信息栏' });
  button.setAttribute('aria-label', '左侧信息栏');
  close.setAttribute('aria-label', '收起左侧信息栏');
  rail.append(button);

  style.textContent = `
    #feedscript-rail, #feedscript-close { display:none!important; }
    @media ${narrow.media} { html.feedscript-active {
      &:has(link#__css-map__[href*="/light.css"]) { color-scheme:light!important; }
      &:has(link#__css-map__[href*="/dark.css"]) { color-scheme:dark!important; }
      &, :is(body,.feedscript-left,.feedscript-scroll,.feedscript-home-menu) { scrollbar-width:thin!important; }
      &, body { overflow-x:clip!important; scrollbar-gutter:auto!important; }
      .feedscript-hidden, :is(${header}):not(.feedscript-header):not(.feedscript-header *) { display:none!important; }
      &:has(.feedscript-header) { --feedscript-header-height:56px; }
      .feedscript-header { position:sticky!important; top:var(--broadcast-navigation-height,0px)!important; height:56px!important; z-index:1300!important; }
      .feedscript-header, .feedscript-header :is(.bili-header,.bili-header__bar) { width:100%!important; min-width:0!important; max-width:none!important; margin:0!important; height:56px!important; box-sizing:border-box!important; }
      .feedscript-header .bili-header__bar { position:relative!important; inset:auto!important; padding:0 8px!important; }
      .feedscript-header :is(.left-entry-main > :not(.home-page-panel-entry),.right-entry__main > :not(.header-avatar-wrap),.right-entry > :not(.right-entry__main)) { display:none!important; }
      .feedscript-header .left-entry { display:flex!important; flex:0 0 auto!important; min-width:0!important; margin-right:8px!important; }
      .feedscript-header .home-page-panel-entry { margin:0!important; }
      .feedscript-header .home-page-panel-entry .big-logo, .feedscript-header .big-logo__logo { width:64px!important; height:30px!important; }
      .feedscript-header .home-page-panel-entry .trigger-text { font-size:14px!important; }
      .feedscript-header .center-search-container { display:block!important; flex:1!important; min-width:0!important; }
      .feedscript-header .center-search__bar { width:100%!important; min-width:0!important; max-width:none!important; }
      .feedscript-header .right-entry { flex:0 0 auto!important; }
      /* 与 HomePageScripts 共用处理方式，保留原生父级和悬停连接区。 */
      .feedscript-header .bili-header__bar :is(.feedscript-avatar-menu,.feedscript-avatar-submenu,.feedscript-home-menu) {
        position:fixed!important; left:var(--feedscript-avatar-left,0px)!important; top:var(--feedscript-avatar-top,0px)!important;
        right:auto!important; bottom:auto!important; margin:0!important; transform:none!important;
        zoom:var(--feedscript-avatar-zoom,1)!important; transition-property:opacity!important;
      }
      .feedscript-header .bili-header__bar .feedscript-avatar-submenu-left { padding-left:0!important; padding-right:10px!important; }
      .feedscript-home-menu { width:min(900px,calc(100vw - 16px))!important; max-height:calc(100vh - var(--broadcast-navigation-height,0px) - 72px)!important; overflow:auto!important; box-sizing:border-box!important; }
      .feedscript-home-menu :is(.v-popover-content,.bili-header-channel-panel) { width:100%!important; min-width:0!important; box-sizing:border-box!important; }
      .feedscript-home-menu .bili-header-channel-panel { display:grid!important; grid-template-columns:repeat(auto-fit,minmax(130px,1fr))!important; gap:4px!important; padding:8px!important; }
      .feedscript-home-menu .channel-panel__column { display:contents!important; }
      .feedscript-home-menu .channel-panel__item { min-width:0!important; width:auto!important; height:auto!important; min-height:32px!important; padding:6px!important; margin:0!important; gap:8px!important; font-size:14px!important; white-space:nowrap!important; }
      .feedscript-home-menu .navigation-channel-icon { flex:none!important; }
      :is(.feedscript-path,.feedscript-main,.feedscript-fit,.feedscript-scroll), .feedscript-main > ${pageChild},
      .feedscript-main :is(${fullWidth},${content}) { box-sizing:border-box!important; min-width:0!important; max-width:100%!important; }
      :is(.feedscript-path,.feedscript-main) { width:100%!important; }
      .bili-dyn-home--member { padding-inline:0!important; }
      .feedscript-main { margin-inline:0!important; padding:8px!important; }
      .feedscript-main > ${pageChild}, .feedscript-main :is(${fullWidth}) { width:100%!important; margin-left:0!important; margin-right:0!important; }
      ${dynamicContentStyle('.feedscript-main')}
      &:not(.feedscript-open) .bili-dyn-up-list :is(button,[role="button"],[class*="btn"],[class*="nav"],[class*="prev"],[class*="next"],[class*="left"],[class*="right"]) { z-index:1201!important; }
      .feedscript-scroll { width:100%!important; overflow-x:auto!important; overflow-y:hidden!important; }
      .feedscript-scroll > * { flex-shrink:0!important; }
      .feedscript-left {
        display:block!important; position:fixed!important; inset:calc(var(--feedscript-header-height,0px) + var(--broadcast-navigation-height,0px) + 8px) auto auto ${railWidth}px!important; width:${leftWidth}!important;
        min-width:0!important; height:auto!important; max-height:calc(100vh - var(--feedscript-header-height,0px) - var(--broadcast-navigation-height,0px) - 16px)!important; margin:0!important; padding:12px!important;
        box-sizing:border-box!important; overflow:auto!important; overscroll-behavior:contain; visibility:hidden!important; pointer-events:none!important;
        background:var(--bg1,#fff)!important; border-radius:8px; box-shadow:0 8px 28px #0003; z-index:1000!important;
        transform:none!important; filter:none!important; contain:none!important;
      }
      &.feedscript-open .feedscript-left { visibility:visible!important; pointer-events:auto!important; }
      &.feedscript-open #feedscript-close { display:block!important; }
      #feedscript-close {
        position:fixed!important; top:calc(var(--feedscript-header-height,0px) + var(--broadcast-navigation-height,0px) + 12px)!important; left:calc(${railWidth}px + ${leftWidth} - 36px)!important; width:28px; height:28px;
        padding:0; margin:0; border:0; border-radius:4px; background:var(--bg1,Canvas); color:var(--text2,CanvasText); font:22px/1 system-ui,sans-serif; cursor:pointer; z-index:1001;
      }
      #feedscript-close:hover { background:var(--graph_weak,ButtonFace); color:var(--text1,CanvasText); }
      .feedscript-left > ${pageChild} { max-width:100%!important; }
      .feedscript-left :is(.bili-dyn-my-info,.bili-dyn-live-users) { position:static!important; height:auto!important; min-height:0!important; max-height:none!important; }
      .feedscript-profile { ${profileCSS} }
      #feedscript-rail { display:block!important; position:fixed!important; inset:calc(var(--feedscript-header-height,0px) + var(--broadcast-navigation-height,0px)) auto 0 0!important; width:${railWidth}px!important; background:var(--bg1,Canvas); color:var(--text3,CanvasText); opacity:.55; pointer-events:none; user-select:none; z-index:1200; }
      #feedscript-toggle {
        position:absolute!important; inset:0 0 0 ${railDeadZone}px!important; width:${railWidth - railDeadZone}px!important; height:100%!important;
        box-sizing:border-box; margin:0; padding:0; border:0; border-right:1px solid var(--line_regular,GrayText); border-radius:0;
        background:transparent; color:inherit; font:700 26px/1 system-ui,sans-serif; cursor:pointer; pointer-events:auto;
      }
      #feedscript-toggle:hover, #feedscript-toggle[aria-expanded="true"] { background:#00aeec!important; color:#fff!important; }
      #feedscript-toggle:focus-visible { outline:2px solid #00aeec; outline-offset:-2px; }
    } }
  `;

  // 信息栏保持挂载；开合只改变可见性，不触发全页重排扫描。
  function setOpen(value) {
    open = Boolean(value && left?.isConnected && main?.isConnected);
    html.classList.toggle('feedscript-open', open);
    button.setAttribute('aria-expanded', String(open));
    button.textContent = open ? '‹' : '›';
    button.title = `${open ? '隐藏' : '显示'}左侧信息栏`;
    if (left) left.inert = !open;
  }
  // 只恢复仍由脚本持有的属性，不覆盖页面后续修改。
  function setAttribute(element,name,value,guard = true) {
    const original = element.getAttribute(name);
    element.setAttribute(name,value);
    return () => {
      if (guard && element.getAttribute(name) !== value) return;
      if (original === null) element.removeAttribute(name); else element.setAttribute(name,original);
    };
  }
  // 图片和浮层共用样式快照、恢复，避免两套清理逻辑。
  const saveStyles = (element,names) => new Map(names.map(name => [name,{
    value:element.style.getPropertyValue(name), priority:element.style.getPropertyPriority(name),
  }]));
  function restoreStyles(element,values) {
    for (const [name,{value,priority}] of values) {
      if (value) element.style.setProperty(name,value,priority); else element.style.removeProperty(name);
    }
  }
  function resetAvatarMenu(element,saved) {
    element.classList.remove('feedscript-avatar-menu','feedscript-avatar-submenu','feedscript-avatar-submenu-left','feedscript-home-menu');
    restoreStyles(element,saved.original);
    resize.unobserve(element); avatarMenus.delete(element);
  }
  // 定位、缩放及二级菜单翻向逻辑沿用 HomePageScripts。
  function fitAvatarMenu(element,anchor,submenu,targets,home = false) {
    let saved = avatarMenus.get(element);
    if (!saved) {
      saved = { original:saveStyles(element,avatarProperties), zoom:1 };
      avatarMenus.set(element,saved); resize.observe(element);
    }
    targets.add(element);
    element.classList.add(home ? 'feedscript-home-menu' : submenu ? 'feedscript-avatar-submenu' : 'feedscript-avatar-menu');
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const anchorRect = anchor.getBoundingClientRect();
    const inset = parseFloat(getComputedStyle(html).getPropertyValue('--broadcast-navigation-height')) || 0;
    const menuTop = inset && submenu ? element.closest('.feedscript-avatar-menu')?.getBoundingClientRect().top || 0 : 0;
    const minimumTop = Math.max(inset + 8,menuTop);
    let top = Math.max(minimumTop,Math.min(anchorRect.bottom,innerHeight - 16));
    const width = rect.width / saved.zoom, height = rect.height / saved.zoom;
    const zoom = Math.min(1,Math.max(1,html.clientWidth - 16) / width,Math.max(1,innerHeight - (submenu ? minimumTop + 8 : top + 8)) / height);
    let left;
    if (submenu) {
      const rightFits = anchorRect.right + width * zoom <= html.clientWidth - 8;
      const leftFits = anchorRect.left - width * zoom >= 8;
      element.classList.toggle('feedscript-avatar-submenu-left',!rightFits);
      left = rightFits ? anchorRect.right : leftFits ? anchorRect.left - width * zoom : anchorRect.right - width * zoom;
      left = Math.max(8,Math.min(left,html.clientWidth - width * zoom - 8));
      top = Math.max(minimumTop,Math.min((anchorRect.top + anchorRect.bottom - height * zoom) / 2,innerHeight - height * zoom - 8));
    } else left = Math.max(8,Math.min(home ? anchorRect.left : anchorRect.right - width * zoom,html.clientWidth - width * zoom - 8));
    // CSS zoom 同样缩放 fixed 坐标；包含页面已有的 zoom。
    const scale = rect.width / element.offsetWidth / saved.zoom * zoom;
    const values = [`${left / scale}px`,`${top / scale}px`,String(zoom)];
    avatarProperties.forEach((name,index) => {
      if (element.style.getPropertyValue(name) !== values[index]) element.style.setProperty(name,values[index]);
    });
    saved.zoom = zoom;
  }
  function fitAvatarMenus() {
    const targets = new Set();
    for (const element of document.querySelectorAll('.feedscript-header .bili-header__bar .header-avatar-wrap > .v-popover-wrap > .v-popover')) {
      const anchor = element.parentElement.querySelector('.header-avatar-wrap--container') || element.closest('.header-avatar-wrap');
      fitAvatarMenu(element,anchor,false,targets);
      for (const submenu of element.querySelectorAll('.v-popover-wrap > .v-popover:is(.is-right,.is-left)')) {
        fitAvatarMenu(submenu,submenu.parentElement,true,targets);
      }
    }
    for (const element of document.querySelectorAll(`.feedscript-header ${homeEntry} > .v-popover`)) {
      fitAvatarMenu(element,element.parentElement.querySelector('.left-entry__item-trigger'),false,targets,true);
    }
    for (const [element,saved] of avatarMenus) if (!targets.has(element)) resetAvatarMenu(element,saved);
  }
  // 仅排除当前点击的首页入口/频道链接，同 URL 的动态卡片仍由 BroadcastListScript 接管。
  function syncPotPlayerIgnore() {
    const api = window.__potPlayerBilibiliClick;
    if (api === potPlayerApi) return;
    restoreIgnore(); potPlayerApi = api;
    restoreIgnore = typeof api?.ignoreUrl === 'function'
      ? api.ignoreUrl(url => Boolean(homeClick?.isConnected && url.href === homeClick.href && isPageUrl(url))) : () => {};
  }
  function prepareHomeClick(event) {
    homeClick = event.target instanceof Element ? event.target.closest(`${homeEntry} a[href]`) : null;
    syncPotPlayerIgnore();
  }
  function onHomeClick(event) {
    prepareHomeClick(event);
    clearTimeout(homeClickTimer); homeClickTimer = setTimeout(() => { homeClick = null; },0);
    if (!homeClick || homeClick.hasAttribute('download') || !isPageUrl(homeClick.href) || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    // 只替换该入口的导航，避免原生 _blank 与 PotPlayer 同时打开。
    event.preventDefault(); event.stopImmediatePropagation(); location.assign(homeClick.href);
  }
  function reconcile(next) {
    for (const [element,names] of classes) for (const name of names) if (!next.get(element)?.has(name)) element.classList.remove(name);
    for (const [element,names] of next) for (const name of names) if (!element.classList.contains(name)) element.classList.add(name);
    classes = next;
  }
  function releaseProfile(host) {
    const state = profiles.get(host);
    host.classList.toggle('feedscript-profile',state.hadClass);
    restoreStyles(host,state.styles);
    state.shadowStyle?.remove(); profiles.delete(host);
  }
  function syncProfiles() {
    const visible = new Set();
    if (main) for (const element of document.querySelectorAll(profile)) {
      if (element.parentElement?.closest(profile)) continue;
      let state = profiles.get(element);
      const css = getComputedStyle(element);
      if (!element.offsetWidth || !element.offsetHeight || css.visibility === 'hidden') continue;
      visible.add(element);
      if (!state) {
        state = { hadClass:element.classList.contains('feedscript-profile'), zoom:parseFloat(css.zoom) || 1,
          left:css.left, top:css.top, styles:saveStyles(element,['--feedscript-profile-left','--feedscript-profile-top','--feedscript-profile-zoom']) };
        if (element.shadowRoot) state.shadowStyle = Object.assign(document.createElement('style'),{textContent:`:host {${profileCSS}}`});
        profiles.set(element,state);
      }
      // 官方会在头像、用户名之间切换定位并启用 all .25s 动画。
      // 约束 inline left/top 的最终值，不测量动画中间位置，也不追踪鼠标。
      let unit = state.zoom;
      for (let parent = element.parentElement; parent; parent = parent.parentElement) unit *= parseFloat(getComputedStyle(parent).zoom) || 1;
      const box = element.getBoundingClientRect(), currentUnit = unit / state.zoom * (parseFloat(css.zoom) || 1);
      const size = { left:element.offsetWidth, top:Math.ceil(box.height / currentUnit) + 1 };
      const scale = Math.min(1,(html.clientWidth - 16) / (size.left * unit),(innerHeight - 16) / (size.top * unit));
      unit *= scale;
      const parent = element.offsetParent;
      let origin = { left:0, top:css.position === 'fixed' ? 0 : -scrollY };
      if (css.position !== 'fixed' && parent && parent !== document.body && parent !== html) {
        const box = parent.getBoundingClientRect(), parentUnit = unit / (state.zoom * scale);
        origin = { left:box.left + (parent.clientLeft - parent.scrollLeft) * parentUnit, top:box.top + (parent.clientTop - parent.scrollTop) * parentUnit };
      }
      for (const [axis,limit] of [['left',html.clientWidth],['top',innerHeight]]) {
        const min = (8 - origin[axis]) / unit, max = Math.max(min,(limit - 8 - origin[axis]) / unit - size[axis]);
        element.style.setProperty(`--feedscript-profile-${axis}`,`clamp(${min}px,${element.style[axis] || state[axis]},${max}px)`,'important');
      }
      element.style.setProperty('--feedscript-profile-zoom',String(state.zoom * scale),'important');
      element.classList.add('feedscript-profile');
      if (state.shadowStyle && !state.shadowStyle.isConnected) element.shadowRoot.append(state.shadowStyle);
    }
    for (const element of profiles.keys()) if (!visible.has(element)) releaseProfile(element);
  }
  function syncLayout() {
    if (!style.isConnected) (document.head || html).append(style);
    if (!rail.isConnected) document.body.append(rail);
    if (!close.isConnected) document.body.append(close);
    const root = document.querySelector('.bili-dyn-home--member');
    const nextMain = root?.querySelector('main') || null;
    const nextLeft = nextMain ? root.querySelector('aside.left') : null;
    if (nextMain !== main || nextLeft !== left) {
      setOpen(false); restoreLeft?.(); restoreLeft = null; main = nextMain; left = nextLeft;
      if (left) {
        let id = left.id || 'feedscript-left-panel';
        if (!left.id) while (document.getElementById(id)) id += '-';
        const element = left, inert = left.inert, restoreId = setAttribute(left,'id',id);
        restoreLeft = () => { element.inert = inert; restoreId(); };
      }
    }
    button.disabled = !main || !left;
    if (left) left.inert = !open;
    for (const control of [button,close]) {
      if (left) control.setAttribute('aria-controls',left.id); else control.removeAttribute('aria-controls');
    }
    const next = new Map();
    const mark = (element,name) => {
      if (!next.has(element)) next.set(element,new Set());
      next.get(element).add(`feedscript-${name}`);
    };
    if (main) {
      if (!restoreViewport && document.head) {
        const viewport = document.querySelector('meta[name="viewport"]') || document.createElement('meta');
        if (viewport.isConnected) restoreViewport = setAttribute(viewport,'content','width=device-width, initial-scale=1');
        else {
          viewport.name = 'viewport'; viewport.content = 'width=device-width, initial-scale=1';
          document.head.append(viewport); restoreViewport = () => viewport.remove();
        }
      }
      mark(html,'active'); mark(main,'main'); if (left) mark(left,'left');
      const top = document.querySelector('#bili-header-container:has(.center-search-container):has(.header-avatar-wrap)');
      if (top) {
        mark(top,'header');
        for (let parent = top.parentElement; parent && !next.has(parent); parent = parent.parentElement) mark(parent,'path');
      }
      for (const target of [main,left]) for (let parent = target?.parentElement; parent && !next.has(parent); parent = parent.parentElement) mark(parent,'path');
      for (const [parent,names] of [...next]) if (names.has('feedscript-path')) for (const child of parent.children) {
        if (!next.has(child) && child.matches(extra)) mark(child,'hidden');
      }
      for (const list of main.querySelectorAll('.bili-dyn-up-list')) {
        const scroll = list.querySelector('.bili-dyn-up-list__window') || [...list.querySelectorAll('div')].find(element => ['auto','scroll'].includes(getComputedStyle(element).overflowX));
        if (scroll) mark(scroll,'scroll');
      }
    } else setOpen(false);
    reconcile(next);
    dynamicContent.refresh();
    if (main && window.scrollX) window.scrollTo({ left:0, top:window.scrollY, behavior:'instant' });
  }
  // 退出窄布局与卸载共用恢复流程，官方节点始终留在原位置。
  function clearLayout() {
    setOpen(false); restoreLeft?.(); restoreLeft = null; reconcile(new Map());
    dynamicContent.clear();
    for (const host of [...profiles.keys()]) releaseProfile(host);
    for (const [element,saved] of avatarMenus) resetAvatarMenu(element,saved);
    restoreViewport?.(); restoreViewport = null;
    style.remove(); rail.remove(); close.remove(); main = left = null;
  }
  // 布局、浮层共用一帧；浮层变化只运行轻量定位。
  function refresh(layout = true) {
    if (stopped || !document.body) return;
    layoutPending = false; observer.disconnect();
    try {
      if (narrow.matches) { if (layout) syncLayout(); syncProfiles(); fitAvatarMenus(); }
      else if (style.isConnected) clearLayout();
    } finally { observe(); }
  }
  function schedule(layout = true) {
    layoutPending ||= Boolean(layout);
    if (!stopped && !frame) frame = requestAnimationFrame(() => { frame = 0; refresh(layoutPending); });
  }
  function onClick(event) {
    if (!(event.target instanceof Element)) return;
    if (event.detail && event.clientX < railDeadZone) return;
    if (button.contains(event.target)) setOpen(!open);
    else if (close.contains(event.target)) { setOpen(false); button.focus(); }
    else if (open && !event.target.closest(popup) && (!left.contains(event.target) || event.target.closest('a[href]'))) setOpen(false);
  }
  function onKey(event) {
    if (open && event.key === 'Escape') { setOpen(false); button.focus(); }
  }
  // 一个观察器分流布局和浮层更新；侧栏变化只重新定位，不扫描整个动态列表。
  const observer = new MutationObserver(records => {
    if (records.some(({target,type,attributeName}) => target instanceof Element && target !== html && target.getRootNode() === document && !target.closest(`#feedscript-rail,.feedscript-left,.feedscript-profile,.feedscript-header,${profile}`) &&
      (type === 'childList' || attributeName === 'class' && target.contains(main)))) schedule();
    else schedule(false);
  });
  function observe() {
    if (stopped || !narrow.matches) return;
    const options = { childList:true, subtree:true, attributes:true, attributeFilter:['style','class','hidden'] };
    observer.observe(html,options);
    for (const element of profiles.keys()) if (element.shadowRoot) observer.observe(element.shadowRoot,options);
  }
  const resize = new ResizeObserver(() => {
    if (html.clientWidth !== width) { width = html.clientWidth; schedule(); }
    else schedule(false);
  });
  resize.observe(html);
  for (const [target,type,handler,capture = false] of [
    [document,'click',onClick], [document,'keydown',onKey],
    [document,'load',schedule,true], [window,'resize',() => schedule(false)],
    [window,'pageshow',schedule], [window,'scroll',() => schedule(false),true],
    [narrow,'change',schedule],
    [window,'pointerdown',prepareHomeClick,true], [window,'keydown',event => { if (event.key === 'Enter') prepareHomeClick(event); },true],
    [window,'click',onHomeClick,true],
  ]) target.addEventListener(type,handler,{ capture, signal:events.signal });
  syncPotPlayerIgnore();
  refresh();
  window.bilibiliFeedScript = {
    version:'1.2.16', refresh,
    destroy() {
      dynamicContent.destroy();
      avatarNavigation.destroy();
      headerSearchNavigation.destroy();
      stopped = true; events.abort(); observer.disconnect(); resize.disconnect(); cancelAnimationFrame(frame);
      clearTimeout(homeClickTimer); homeClick = null; restoreIgnore();
      clearLayout();
    },
  };

  return window.bilibiliFeedScript;
}
