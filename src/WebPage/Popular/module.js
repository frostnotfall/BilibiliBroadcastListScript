import {avatarSubmenuPosition} from '../../common/avatar-submenu-position.js';
import {fitHomeHeader, createHeaderCards} from '../../common/main-site/header-controls.js';
import {homeStyle} from '../../common/main-site/home-style.js';
import {pageId, isPageUrl, isMediaUrl, createPageOpening} from '../../common/index.js';
import {createHeaderSearchNavigation, createAvatarNavigation} from '../../common/main-site/home-navigation.js';
export const early = () => createPageOpening();
export function mount() {
  'use strict';
  const matchesPage = () => pageId(location.href) === 'Popular';
  if (!matchesPage()) return;
  window.bilibiliHomePageScript?.destroy();

  const headerSearchNavigation = createHeaderSearchNavigation();
  const headerCards = createHeaderCards();

  const avatarNavigation = createAvatarNavigation();

  const html = document.documentElement;
  const narrow = matchMedia('(max-width: 1099px)');
  const navigationScope = '.bili-header,.bili-header__bar,#homepagescript-menu,.header-channel,.channel-entry-popover,.bili-header-channel-panel,.link-navbar,.charity-header';
  const navigationLinks = navigationScope.split(',').map(selector => `${selector} a[href]`).join(',');
  const events = new AbortController();
  const hidden = new Set(), attributes = new Map(), variables = new Map();
  const menus = new Map(), observed = new Set();
  const avatarMenus = new Map(), avatarTargets = new Set();
  let potPlayerApi = null, restorePotPlayerIgnore = () => {};
  let observedUrl = location.href;
  let frame = 0, stopped = false, activeMenu = null;
  const style = document.createElement('style');
  style.id = 'homepagescript-style';
  style.textContent = homeStyle();

  // 本页内容布局；共有控件以上述首页实现为准。
  style.textContent += "\n@media(max-width:1099px) {\nhtml.homepagescript-active :is(.bili-footer,.b-footer-wrap,.footer) {box-sizing:border-box!important;min-width:0!important;width:100%!important;padding:12px!important;}\nhtml.homepagescript-active :is(.link-box,.other-link,.link-item__right) {flex-wrap:wrap!important;gap:12px!important;width:100%!important;}\nhtml.homepagescript-active :is(.link-item,.text-con,.text-con__line) {min-width:0!important;width:100%!important;white-space:normal!important;overflow-wrap:anywhere!important;}\n}@media(max-width:1099px) {\nhtml.homepagescript-active .popular-container {box-sizing:border-box!important;width:100%!important;min-width:0!important;padding:8px!important;margin:0!important;}\nhtml.homepagescript-active .nav-tabs {overflow-x:auto!important;gap:8px!important;}\nhtml.homepagescript-active .nav-tabs__item {flex-shrink:0!important;}\nhtml.homepagescript-active .card-list {display:grid!important;grid-template-columns:repeat(var(--homepagescript-columns,2),minmax(0,1fr))!important;gap:16px 12px!important;}\nhtml.homepagescript-active .video-card {display:flex!important;flex-direction:column!important;width:100%!important;min-width:0!important;margin:0!important;height:auto!important;}\nhtml.homepagescript-active :is(.video-card__content,.video-card__info) {box-sizing:border-box!important;width:100%!important;min-width:0!important;height:auto!important;padding:0!important;}\nhtml.homepagescript-active .video-card__content {aspect-ratio:16/9;}\nhtml.homepagescript-active .video-card__content :is(a,img) {width:100%!important;height:100%!important;}\nhtml.homepagescript-active .video-name {width:100%!important;margin:8px 0!important;}\n}";

  const panel = document.createElement('div');
  panel.id = 'homepagescript-menu';
  panel.setAttribute('aria-label', '全部频道');
  // 五个热门入口共享顶栏和标签；排行榜和音乐榜保留各自的原生内容与交互。
  style.textContent += `
    @media(max-width:1099px) {
      html.homepagescript-active .weekly-list .video-list { display:grid!important; grid-template-columns:repeat(var(--homepagescript-columns,2),minmax(0,1fr))!important; gap:16px 12px!important; }
      html.homepagescript-active .popular-container :is(.popular-video-container,.rank-container,.flow-loader,.rank-list-wrap) { min-width:0!important; max-width:100%!important; }
      html.homepagescript-active .popular-container :is(.popular-tips,.weekly-header) { flex-wrap:wrap!important; gap:8px!important; height:auto!important; }
      html.homepagescript-active .popular-container .history-tips { height:auto!important; white-space:normal!important; }
      html.homepagescript-active .weekly-header .date-info .panel { box-sizing:border-box!important; max-width:calc(100vw - 32px)!important; }
      html.homepagescript-active .rank-tab-wrap { overflow-x:auto!important; }
      html.homepagescript-active .rank-tab { display:flex!important; width:max-content!important; min-width:100%!important; }
      html.homepagescript-active .rank-tab > li { flex:none!important; }
      html.homepagescript-active .rank-tips { white-space:normal!important; height:auto!important; }
      html.homepagescript-active .rank-list { display:grid!important; grid-template-columns:repeat(var(--homepagescript-columns,2),minmax(0,1fr))!important; gap:16px 12px!important; }
      html.homepagescript-active .rank-item { box-sizing:border-box!important; width:100%!important; min-width:0!important; margin:0!important; }
      html.homepagescript-active .rank-item .content { display:flex!important; flex-direction:column!important; width:100%!important; min-width:0!important; }
      html.homepagescript-active .rank-item :is(.img,.info,.detail,.detail-state) { box-sizing:border-box!important; width:100%!important; min-width:0!important; height:auto!important; margin:0!important; }
      html.homepagescript-active .rank-item .img { aspect-ratio:16/9; }
      html.homepagescript-active .rank-item .img :is(a,img) { display:block; width:100%!important; height:100%!important; }
      html.homepagescript-active .rank-item .info { padding:8px 0 0!important; }
      html.homepagescript-active .rank-item .title { width:100%!important; }
      html.homepagescript-active .rank-item .detail-state { display:flex!important; flex-wrap:wrap!important; gap:4px 10px!important; }
      /* 音乐榜使用 CSS Modules；按语义前缀匹配，避免绑定构建哈希。 */
      html.homepagescript-active .music-rank-list [class*="_cardList_"] { display:flex!important; flex-direction:column!important; gap:12px!important; width:100%!important; }
      html.homepagescript-active .music-rank-list :is([class*="_card_"],[class*="_cardContainer_"]) { box-sizing:border-box!important; width:100%!important; min-width:0!important; height:auto!important; margin:0!important; padding:12px!important; }
      html.homepagescript-active .music-rank-list [class*="_right_"] { flex:1!important; min-width:0!important; }
      html.homepagescript-active .music-rank-list [class*="_musicInfo_"] { position:relative!important; display:grid!important; grid-template-columns:80px minmax(0,1fr)!important; gap:8px!important; height:auto!important; min-height:80px!important; }
      html.homepagescript-active .music-rank-list [class*="_musicInfo_"] > svg { grid-area:1 / 1; width:80px!important; height:80px!important; }
      html.homepagescript-active .music-rank-list [class*="_musicInfo_"] > img { grid-area:1 / 1; position:relative!important; inset:auto!important; width:80px!important; height:80px!important; }
      html.homepagescript-active .music-rank-list [class*="_musicInfo_"] > [class*="_info_"] { grid-area:1 / 2; }
      html.homepagescript-active .music-rank-list [class*="_musicInfo_"] > [class*="_otherInfo_"] { grid-column:1 / -1; height:auto!important; }
      html.homepagescript-active .music-rank-list [class*="_heat_"] { margin:0!important; }
      html.homepagescript-active .music-rank-list :is([class*="_info_"],[class*="_top_"],[class*="_left_"],[class*="_subtitle_"],[class*="_upName_"]) { min-width:0!important; max-width:100%!important; height:auto!important; margin-left:0!important; }
      html.homepagescript-active .music-rank-list [class*="_vidoInfo_"] { flex-direction:column!important; gap:8px!important; height:auto!important; }
      html.homepagescript-active .music-rank-list [class*="_vidoInfo_"] > [class*="_cover_"] { width:100%!important; height:auto!important; aspect-ratio:16/9; }
      html.homepagescript-active .music-rank-list [class*="_coverImg_"] { width:100%!important; height:100%!important; object-fit:cover; }
      html.homepagescript-active .music-rank-list [class*="_cardContainer_"] { flex-direction:column!important; gap:12px!important; }
      html.homepagescript-active .music-rank-list [class*="_divider_"] { width:100%!important; height:1px!important; margin:0!important; }
      html.homepagescript-active .music-rank-list [class*="_videoList_"] { display:grid!important; grid-template-columns:repeat(auto-fit,minmax(140px,1fr))!important; gap:12px!important; width:100%!important; min-width:0!important; }
      html.homepagescript-active .music-rank-list [class*="_videoCard_"] { width:100%!important; min-width:0!important; margin:0!important; }
      html.homepagescript-active .music-rank-list [class*="_videoCover_"] { width:100%!important; height:auto!important; aspect-ratio:16/9; }
      html.homepagescript-active .music-rank-list [class*="_videoCover_"] > img { width:100%!important; height:100%!important; object-fit:cover; }
      html.homepagescript-active .music-rank-list [class*="_bottomTermSelect_"] { width:100%!important; min-width:0!important; margin-right:0!important; }
      html.homepagescript-active .music-rank-list [class*="_scrollContainer_"] { min-width:0!important; }
    }
  `;
  (document.head || html).append(style);
  html.classList.add('homepagescript-active');

  function rememberAttribute(element, name, value) {
    let saved = attributes.get(element);
    if (!saved) attributes.set(element, saved = new Map());
    if (!saved.has(name)) saved.set(name, { original:element.getAttribute(name), value });
    saved.get(name).value = value;
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }

  function setColumns(element, count) {
    const name = '--homepagescript-columns';
    if (!variables.has(element)) variables.set(element, element.style.getPropertyValue(name));
    const value = String(count);
    if (element.style.getPropertyValue(name) !== value) element.style.setProperty(name, value);
  }

  function fit(items, count) {
    items.forEach((element, index) => {
      const hide = narrow.matches && index >= count;
      if (hide && !element.classList.contains('homepagescript-hidden')) {
        element.classList.add('homepagescript-hidden'); hidden.add(element);
      } else if (!hide && hidden.delete(element)) element.classList.remove('homepagescript-hidden');
    });
  }

  function fitHeader() { fitHomeHeader(hidden, fit); }

  function observe(element) {
    if (!observed.has(element)) { observed.add(element); resize.observe(element); }
  }

  function makeMore(container, source) {
    let menu = menus.get(container);
    if (!menu) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'homepagescript-more'; button.textContent = '更多 ▾';
      button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', panel.id);
      button.addEventListener('click', event => {
        if (activeMenu === menu) closeMenu();
        else { openMenu(menu); if (event.detail === 0) panel.querySelector('a')?.focus(); }
      }, { signal:events.signal });
      menu = { container, button, source };
      menus.set(container, menu); container.append(button);
    }
    menu.source = source;
    if (menu.button.parentElement !== container) container.append(menu.button);
    return menu;
  }

  function closeMenu(focus = false) {
    if (!activeMenu) return;
    const button = activeMenu.button;
    button.setAttribute('aria-expanded', 'false'); panel.removeAttribute('data-open'); activeMenu = null;
    if (focus && button.isConnected) button.focus();
  }

  function openMenu(menu) {
    closeMenu();
    panel.replaceChildren();
    const seen = new Set();
    for (const source of menu.source()) {
      const href = source.getAttribute('href'), label = source.textContent.trim();
      if (!href || !label || seen.has(href)) continue;
      seen.add(href);
      const link = document.createElement('a');
      link.textContent = label; link.href = href;
      for (const name of ['target','rel','title']) {
        if (source.hasAttribute(name)) link.setAttribute(name, source.getAttribute(name));
      }
      panel.append(link);
    }
    document.body.append(panel); activeMenu = menu;
    menu.button.setAttribute('aria-expanded', 'true'); panel.setAttribute('data-open', '');
    const rect = menu.button.getBoundingClientRect();
    panel.style.width = `${Math.min(520, Math.max(0, html.clientWidth - 16))}px`;
    const width = panel.getBoundingClientRect().width;
    panel.style.left = `${Math.max(8, Math.min(rect.right - width, html.clientWidth - width - 8))}px`;
    const below = innerHeight - rect.bottom - 12;
    const above = Math.max(0, rect.top - 12);
    const down = below >= Math.min(220, above);
    panel.style.top = down ? `${rect.bottom + 4}px` : 'auto';
    panel.style.bottom = down ? 'auto' : `${innerHeight - rect.top + 4}px`;
    panel.style.setProperty('--homepagescript-menu-height', `${Math.max(40, down ? below : above)}px`);
  }

  function isCurrentTabLink(link) {
    if (!(link instanceof HTMLAnchorElement) || link.hasAttribute('download')) return false;
    const url = new URL(link.href, location.href);
    if (link.closest('.bili-header-channel-panel')) return isPageUrl(url);
    return isAvatarNavigationLink(link) || Boolean(link.closest(navigationScope) && isCompletedNavigation(url));
  }

  function isAvatarNavigationLink(link) {
    return avatarNavigation.isLink(link);
  }

  const isCompletedNavigation = isPageUrl;

  // BroadcastListScript 的规则属于安装实例；加载顺序和重新注入都需重新同步。
  function isNavigationIgnored(url) {
    return isCompletedNavigation(url);
  }

  function syncPotPlayerIgnore() {
    if (location.href !== observedUrl) { observedUrl = location.href; schedule(); }
    const api = window.__potPlayerBilibiliClick;
    if (api === potPlayerApi) return;
    restorePotPlayerIgnore();
    potPlayerApi = api;
    restorePotPlayerIgnore = typeof api?.ignoreUrl === 'function'
      ? api.ignoreUrl(isNavigationIgnored) : () => {};
  }

  const avatarProperties = ['--homepagescript-avatar-left', '--homepagescript-avatar-top', '--homepagescript-avatar-zoom'];
  function resetAvatarMenu(element, saved) {
    element.classList.remove('homepagescript-avatar-menu', 'homepagescript-avatar-submenu', 'homepagescript-avatar-submenu-left');
    for (const name of avatarProperties) {
      const original = saved.original.get(name);
      if (original.value) element.style.setProperty(name, original.value, original.priority);
      else element.style.removeProperty(name);
    }
    saved.zoom = 1;
    saved.style = element.getAttribute('style');
  }

  function fitAvatarMenu(element, anchor, submenu, targets) {
      let saved = avatarMenus.get(element);
      if (!saved) {
        saved = { original:new Map(avatarProperties.map(name => [name, {
          value:element.style.getPropertyValue(name), priority:element.style.getPropertyPriority(name),
        }])), zoom:1, style:element.getAttribute('style') };
        avatarMenus.set(element, saved); observe(element);
      }
      for (const target of [element, element.parentElement, element.closest('.header-avatar-wrap,.user-panel-ctnr')]) if (target) targets.add(target);
      if (!narrow.matches) {
        if (element.classList.contains('homepagescript-avatar-menu') || element.classList.contains('homepagescript-avatar-submenu')) resetAvatarMenu(element, saved);
        return;
      }
      const className = submenu ? 'homepagescript-avatar-submenu' : 'homepagescript-avatar-menu';
      if (!element.classList.contains(className)) element.classList.add(className);
      const rect = element.getBoundingClientRect();
      if (rect.width && rect.height) {
        const anchorRect = anchor.getBoundingClientRect();
        let top = Math.max(8, Math.min(anchorRect.bottom, innerHeight - 16));
        const width = rect.width / saved.zoom, height = rect.height / saved.zoom;
        const zoom = Math.min(1, Math.max(1, html.clientWidth - 16) / width, Math.max(1, innerHeight - (submenu ? 16 : top + 8)) / height);
        let left;
        if (submenu) {
          const position = avatarSubmenuPosition(anchorRect, width * zoom, html.clientWidth);
          // padding 是原生悬停连接区；翻向左侧时也翻转 padding。
          element.classList.toggle('homepagescript-avatar-submenu-left', position.opensLeft);
          left = position.left;
          top = Math.max(8, Math.min((anchorRect.top + anchorRect.bottom - height * zoom) / 2, innerHeight - height * zoom - 8));
        } else left = Math.max(8, Math.min(anchorRect.right - width * zoom, html.clientWidth - width * zoom - 8));
        // CSS zoom 同样缩放 fixed 坐标；包含页面已有的 zoom。
        const scale = rect.width / element.offsetWidth / saved.zoom * zoom;
        const values = [`${left / scale}px`, `${top / scale}px`, String(zoom)];
        avatarProperties.forEach((name, index) => {
          if (element.style.getPropertyValue(name) !== values[index]) element.style.setProperty(name, values[index]);
        });
        saved.zoom = zoom;
      }
      saved.style = element.getAttribute('style');
  }

  function fitAvatarMenus() {
    const targets = new Set();
    for (const element of document.querySelectorAll('.bili-header__bar .header-avatar-wrap > .v-popover-wrap > .v-popover,.bili-header__bar .header-avatar-wrap.v-popover-wrap > .v-popover,.link-navbar .user-panel-ctnr > .user-panel')) {
      const anchor = element.parentElement.querySelector('.header-avatar-wrap--container') || element.closest('.header-avatar-wrap,.user-panel-ctnr');
      fitAvatarMenu(element, anchor, false, targets);
      for (const submenu of element.querySelectorAll('.v-popover-wrap > .v-popover:is(.is-right,.is-left)')) {
        fitAvatarMenu(submenu, submenu.parentElement, true, targets);
      }
    }
    for (const [element, saved] of avatarMenus) if (!targets.has(element)) {
      resetAvatarMenu(element, saved); avatarMenus.delete(element);
    }
    if (targets.size !== avatarTargets.size || Array.from(targets).some(element => !avatarTargets.has(element))) {
      avatarMutations.disconnect(); avatarTargets.clear();
      for (const element of targets) {
        avatarTargets.add(element);
        avatarMutations.observe(element, { attributes:true, attributeFilter:['class','style'] });
      }
    }
  }

  function update() {
    frame = 0;
    if (stopped) return;
    if (!matchesPage()) { window.bilibiliHomePageScript?.destroy(); return; }
    fitAvatarMenus();
    // 原生频道弹出菜单可能挂在 body 下，不能只扫描顶栏的后代。
    for (const link of document.querySelectorAll(navigationLinks)) {
      if (isCurrentTabLink(link)) rememberAttribute(link, 'target', '_self');
    }
    for (const [element] of variables) if (!element.isConnected) variables.delete(element);
    for (const element of hidden) if (!element.isConnected) hidden.delete(element);
    for (const element of observed) if (!element.isConnected) { resize.unobserve(element); observed.delete(element); }
    for (const [container, menu] of menus) if (!container.isConnected) {
      if (activeMenu === menu) closeMenu();
      menu.button.remove(); menus.delete(container);
    }
    if (!narrow.matches) {
      closeMenu();
      for (const element of hidden) element.classList.remove('homepagescript-hidden');
      hidden.clear(); return;
    }
    fitHeader();
    for (const container of document.querySelectorAll('.channel-items__left')) {
      observe(container);
      const count = Math.max(2, Math.floor((container.clientWidth + 6) / 82));
      setColumns(container, count);
      makeMore(container, () => Array.from(container.parentElement.querySelectorAll('a[href]')));
      fit(Array.from(container.querySelectorAll(':scope > a')), count - 1);
    }
    for (const container of document.querySelectorAll('.header-channel-fixed-right')) {
      observe(container);
      const count = Math.max(2, Math.floor((container.clientWidth + 6) / 82));
      setColumns(container, count);
      makeMore(container, () => Array.from(container.querySelectorAll('a[href]')));
      fit(Array.from(container.querySelectorAll('a.channel-item')), count - 1);
    }
    for (const container of document.querySelectorAll('.feed2 .recommended-container_floor-aside > .container,.head-cards,.loading-cards,.channel-feed,.popular-container .card-list,.weekly-list .video-list,.popular-container .rank-list,.fav-list-main .items,.section-cards,#room-card-list,main [class~="grid"],.items-container')) {
      observe(container);
      const count = innerWidth < 400 ? 1 : Math.max(2, Math.floor((container.clientWidth + 12) / 232));
      setColumns(container, count);
    }
  }

  function schedule() { if (!stopped && !frame) frame = requestAnimationFrame(update); }
  const resize = new ResizeObserver(schedule);
  const avatarMutations = new MutationObserver(records => {
    if (records.some(record => record.attributeName !== 'style' || !avatarMenus.has(record.target)
      || avatarMenus.get(record.target).style !== record.target.getAttribute('style'))) schedule();
  });
  resize.observe(html);
  const mutations = new MutationObserver(records => {
    if (records.some(record => !panel.contains(record.target) && record.target !== panel)) schedule();
  });
  mutations.observe(document.body, { childList:true, subtree:true });
  window.addEventListener('resize', () => { closeMenu(); schedule(); }, { signal:events.signal });
  narrow.addEventListener('change', schedule, { signal:events.signal });
  document.addEventListener('scroll', event => {
    if (event.target !== panel && !panel.contains(event.target)) closeMenu();
  }, { capture:true, passive:true, signal:events.signal });
  document.addEventListener('pointerdown', event => {
    if (activeMenu && !panel.contains(event.target) && !activeMenu.button.contains(event.target)) closeMenu();
  }, { capture:true, signal:events.signal });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && activeMenu) { event.preventDefault(); closeMenu(true); }
  }, { signal:events.signal });
  panel.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); }, { signal:events.signal });
  // 在 window 捕获阶段同步，先于后加载的 BroadcastListScript 的点击拦截器。
  window.addEventListener('pointerdown', syncPotPlayerIgnore, { capture:true, signal:events.signal });
  window.addEventListener('click', syncPotPlayerIgnore, { capture:true, signal:events.signal });
  syncPotPlayerIgnore();
  const potPlayerTimer = setInterval(syncPotPlayerIgnore, 500);
  // 捕获普通左键，避免首页自身的点击处理器另外打开标签页；保留 Ctrl/中键等浏览器操作。
  document.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!isCurrentTabLink(link)) return;
    event.preventDefault(); event.stopImmediatePropagation(); location.assign(link.href);
  }, { capture:true, signal:events.signal });

  window.bilibiliHomePageScript = {
    destroy() {
      avatarNavigation.destroy();
      headerSearchNavigation.destroy();
      headerCards.destroy();
      stopped = true; events.abort(); mutations.disconnect(); avatarMutations.disconnect(); resize.disconnect(); cancelAnimationFrame(frame); closeMenu();
      clearInterval(potPlayerTimer); restorePotPlayerIgnore();
      for (const [element, saved] of avatarMenus) resetAvatarMenu(element, saved);
      for (const element of hidden) element.classList.remove('homepagescript-hidden');
      for (const [element, saved] of attributes) for (const [name, {original, value}] of saved) {
        if (element.getAttribute(name) !== value) continue;
        if (original === null) element.removeAttribute(name); else element.setAttribute(name, original);
      }
      for (const [element, value] of variables) {
        if (value) element.style.setProperty('--homepagescript-columns', value); else element.style.removeProperty('--homepagescript-columns');
      }
      for (const menu of menus.values()) menu.button.remove();
      panel.remove(); style.remove(); html.classList.remove('homepagescript-active');
      delete window.bilibiliHomePageScript;
    },
  };
  update();

  return window.bilibiliHomePageScript;
}
