import {avatarSubmenuPosition} from '../avatar-submenu-position.js';
import {fitHomeHeader, createHeaderCards} from './header-controls.js';
import {isPageUrl} from '../urls.js';
import {createHeaderSearchNavigation, createAvatarNavigation} from './home-navigation.js';
export function mountHomeLayout(pageStyle, suppliedMatchesPage) {
  'use strict';
  const matchesPage = suppliedMatchesPage;
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


  style.textContent = pageStyle;
  const panel = document.createElement('div');
  panel.id = 'homepagescript-menu';
  panel.setAttribute('aria-label', '全部频道');
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
  function isNavigationIgnored(url, {explicit = false} = {}) {
    return !explicit && isCompletedNavigation(url);
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
        const inset = parseFloat(getComputedStyle(html).getPropertyValue('--broadcast-navigation-height')) || 0;
        const menuTop = inset && submenu ? element.closest('.homepagescript-avatar-menu')?.getBoundingClientRect().top || 0 : 0;
        const minimumTop = Math.max(inset + 8, menuTop);
        let top = Math.max(minimumTop, Math.min(anchorRect.bottom, innerHeight - 16));
        const width = rect.width / saved.zoom, height = rect.height / saved.zoom;
        const zoom = Math.min(1, Math.max(1, html.clientWidth - 16) / width, Math.max(1, innerHeight - (submenu ? minimumTop + 8 : top + 8)) / height);
        let left;
        if (submenu) {
          const position = avatarSubmenuPosition(anchorRect, width * zoom, html.clientWidth);
          // padding 是原生悬停连接区；翻向左侧时也翻转 padding。
          element.classList.toggle('homepagescript-avatar-submenu-left', position.opensLeft);
          left = position.left;
          top = Math.max(minimumTop, Math.min((anchorRect.top + anchorRect.bottom - height * zoom) / 2, innerHeight - height * zoom - 8));
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
    for (const container of document.querySelectorAll('.feed2 .recommended-container_floor-aside > .container,.head-cards,.loading-cards,.channel-feed,.popular-list .card-list,.fav-list-main .items,.section-cards,#room-card-list,main [class~="grid"],.items-container')) {
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
