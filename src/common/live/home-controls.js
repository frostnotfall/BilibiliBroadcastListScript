import {urlOf} from '../urls.js';

export function createLiveControls({html, narrow, signal, schedule, ownClass, fit, includeSidebar = true}) {

  const liveNavigation = new Map(), liveSidebar = new Map();
  const liveMenu = document.createElement('section');
  liveMenu.id = 'live-home-more-menu'; liveMenu.hidden = true;
  liveMenu.setAttribute('aria-label', '更多直播分区');
  liveMenu.setAttribute('role', 'region');
  let liveMenuOwner = null, liveMenuCategory = null, liveMenuTimer = 0;
  let menuRenderEvents = new AbortController();
  function liveMenuButton(label, className, action, listenerSignal = signal) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = className; button.textContent = label;
    button.addEventListener('click', action, {signal:listenerSignal});
    return button;
  }
  function readLiveMenu(navbar) {
    const categories = [];
    if (navbar.querySelector('.live-home-new-nav')) {
      const entries = Array.from(navbar.querySelectorAll('.nav-title')).map(node => {
        const link = node.closest('a') || node; return {label:node.textContent.trim(),href:link.getAttribute('href'),source:link};
      }).filter(item => item.label && item.label !== '首页');
      for (const group of document.querySelectorAll('#app nav.flex-nowrap > .group')) {
        const link = group.querySelector('a');
        if (!link?.textContent.trim()) continue;
        const children = Array.from(group.querySelectorAll('.absolute a')).map(node => ({label:node.textContent.trim(),href:node.getAttribute('href'),source:node}));
        categories.push({name:link.textContent.trim(),href:link.getAttribute('href'),source:link,children});
      }
      return {entries,categories};
    }
    for (const native of navbar.querySelectorAll('.nav-items-ctnr .nav-item')) {
      const name = native.querySelector('.label')?.textContent.trim();
      if (!name) continue;
      const link = native.closest('a');
      const children = Array.from(native.querySelectorAll('.area-list a')).map(node => ({label:node.querySelector('.list-item')?.textContent.trim() || node.textContent.trim(), href:node.getAttribute('href'), source:node}));
      categories.push({name, href:link?.getAttribute('href'), source:link || native, children});
    }
    const entries = Array.from(navbar.querySelectorAll('.showmore-link .waterfall-item')).map(node => ({label:node.textContent.trim(), href:node.querySelector('a[href]')?.getAttribute('href'), source:node})).filter(item => item.label && !categories.some(category => category.name === item.label));
    return {categories, entries};
  }
  function createLiveMenuLink(entry, className) {
    const valid = entry.href && !/^(?:javascript:|#)/i.test(entry.href) && urlOf(entry.href);
    if (valid) {
      const link = document.createElement('a');
      link.className = className; link.textContent = entry.label; link.href = entry.href; link.target = '_self';
      return link;
    }
    if (entry.source) {
      return liveMenuButton(entry.label, className, () => { closeLiveMenu(); entry.source.click(); }, menuRenderEvents.signal);
    }
    const disabled = liveMenuButton(entry.label, className, () => {}, menuRenderEvents.signal); disabled.disabled = true; return disabled;
  }
  function positionLiveMenu() {
    if (!liveMenuOwner || liveMenu.hidden) return;
    const anchor = liveMenuOwner.button.getBoundingClientRect();
    liveMenu.style.width = 'max-content';
    liveMenu.style.maxWidth = Math.max(0, html.clientWidth - 16) + 'px';
    const below = innerHeight - anchor.bottom - 16, above = anchor.top - 16;
    const useAbove = below < 180 && above > below;
    const available = Math.max(48, useAbove ? above : below);
    const maxHeight = Math.min(640, available);
    liveMenu.style.maxHeight = maxHeight + 'px';
    const width = liveMenu.getBoundingClientRect().width;
    const left = Math.max(8, Math.min(anchor.left, html.clientWidth - width - 8));
    const top = useAbove ? Math.max(8, anchor.top - liveMenu.offsetHeight - 8) : Math.max(8, anchor.bottom + 8);
    liveMenu.style.left = left + 'px'; liveMenu.style.top = top + 'px';
  }
  function renderLiveMenu(focus = false) {
    if (!liveMenuOwner) return;
    menuRenderEvents.abort(); menuRenderEvents = new AbortController();
    const data = readLiveMenu(liveMenuOwner.navbar);
    const category = data.categories.find(item => item.name === liveMenuCategory);
    if (liveMenuCategory && !category) liveMenuCategory = null;
    liveMenu.replaceChildren();
    const header = document.createElement('div'); header.className = 'live-home-menu-header';
    if (category) header.append(liveMenuButton('‹', 'live-home-menu-back', () => { liveMenuCategory = null; renderLiveMenu(true); }, menuRenderEvents.signal));
    const heading = document.createElement('strong'); heading.textContent = category ? category.name : '更多分区'; header.append(heading);
    const close = liveMenuButton('×', 'live-home-menu-close', () => closeLiveMenu(true), menuRenderEvents.signal); close.setAttribute('aria-label','关闭更多分区'); header.append(close);
    if (category) header.firstElementChild.setAttribute('aria-label','返回全部分区');
    const content = document.createElement('div'); content.className = 'live-home-menu-content';
    if (category) {
      if (category.href || category.source) content.append(createLiveMenuLink({label:'全部' + category.name,href:category.href,source:category.source}, 'live-home-menu-all'));
      const grid = document.createElement('div'); grid.className = 'live-home-menu-grid';
      for (const entry of category.children) grid.append(createLiveMenuLink(entry, 'live-home-menu-entry'));
      if (!category.children.length) {
        const empty = document.createElement('p'); empty.className = 'live-home-menu-empty'; empty.textContent = '该分类暂无细分入口'; grid.append(empty);
      }
      content.append(grid);
    } else {
      const grid = document.createElement('div'); grid.className = 'live-home-menu-grid';
      for (const entry of data.entries) grid.append(createLiveMenuLink(entry, 'live-home-menu-entry'));
      content.append(grid);
      const group = document.createElement('div'); group.className = 'live-home-menu-categories';
      for (const item of data.categories) {
        const button = liveMenuButton('', 'live-home-menu-category', () => { liveMenuCategory = item.name; renderLiveMenu(true); }, menuRenderEvents.signal);
        const label = document.createElement('span'); label.textContent = item.name;
        const arrow = document.createElement('span'); arrow.textContent = '›'; arrow.setAttribute('aria-hidden','true');
        button.append(label, arrow); button.setAttribute('aria-label', '展开' + item.name + '子菜单'); group.append(button);
      }
      content.append(group);
    }
    liveMenu.append(header,content); positionLiveMenu();
    if (focus) liveMenu.querySelector('button,a')?.focus({preventScroll:true});
  }
  function closeLiveMenu(focus = false) {
    clearTimeout(liveMenuTimer); liveMenuTimer = 0;
    menuRenderEvents.abort();
    const owner = liveMenuOwner;
    liveMenu.hidden = true; liveMenuOwner = null; liveMenuCategory = null;
    owner?.button.setAttribute('aria-expanded','false');
    if (focus && owner?.button.isConnected) owner.button.focus({preventScroll:true});
  }
  function openLiveMenu(owner, focus = false) {
    clearTimeout(liveMenuTimer); liveMenuTimer = 0;
    if (liveMenuOwner === owner && !liveMenu.hidden) { if (focus) liveMenu.querySelector('button,a')?.focus(); return; }
    closeLiveMenu(); liveMenuOwner = owner; liveMenuCategory = null;
    if (!liveMenu.isConnected) document.body.append(liveMenu);
    liveMenu.hidden = false; owner.button.setAttribute('aria-expanded','true'); renderLiveMenu(focus); schedule();
  }
  function deferCloseLiveMenu() { clearTimeout(liveMenuTimer); liveMenuTimer = setTimeout(() => closeLiveMenu(), 220); }
  liveMenu.addEventListener('pointerenter', () => { clearTimeout(liveMenuTimer); liveMenuTimer = 0; }, {signal:signal});
  liveMenu.addEventListener('click', event => { if (event.target.closest('a[href]')) closeLiveMenu(); }, {signal:signal});
  document.addEventListener('pointerdown', event => {
    if (liveMenuOwner && !liveMenu.contains(event.target) && !liveMenuOwner.button.contains(event.target)) closeLiveMenu();
  }, {capture:true,signal:signal});
  document.addEventListener('keydown', event => {
    if (!liveMenuOwner) return;
    if (event.key === 'Escape') { event.preventDefault(); closeLiveMenu(true); }
  }, {signal:signal});
  document.addEventListener('scroll', event => {
    if (!liveMenu.contains(event.target)) closeLiveMenu();
  }, {capture:true,passive:true,signal:signal});
  function restoreLiveNavigation() {
    closeLiveMenu(); liveMenu.remove();
    for (const [more, owner] of liveNavigation) {
      owner.button.remove(); ownClass(more,'live-home-menu-host',false);
      ownClass(more,'live-home-new-nav',false);
      if (owner.wrapper) ownClass(owner.wrapper,'live-home-new-header',false);
    }
    liveNavigation.clear();
  }
  function restoreLiveSidebar() {
    for (const [node, button] of liveSidebar) { ownClass(node,'live-home-sidebar-collapsed',false); button.remove(); }
    liveSidebar.clear();
  }
  function fitLiveNavigation() {
    if (!narrow.matches) { restoreLiveNavigation(); restoreLiveSidebar(); return; }
    for (const [more, owner] of liveNavigation) if (!more.isConnected) { if (owner === liveMenuOwner) closeLiveMenu(); owner.button.remove(); liveNavigation.delete(more); }
    for (const navbar of document.querySelectorAll('.link-navbar')) {
      const wrapper = navbar.closest('[class~="relative"][class~="z-100"][class~="h-64px"][class~="w-full"][class~="shrink-0"]');
      const modern = wrapper && navbar.querySelector('.nav-title');
      const more = navbar.querySelector(modern ? '.nav-titles' : '.showmore-link');
      if (!more) continue;
      let homeFont = '';
      if (modern) {
        const home = Array.from(more.querySelectorAll('.nav-title')).find(link => link.textContent.trim() === '首页');
        const avatar = navbar.querySelector('.user-panel.dp-table');
        const search = navbar.querySelector('#nav-searchform');
        if (!home || !avatar || !search) continue;
        homeFont = getComputedStyle(home).font;
        ownClass(wrapper,'live-home-new-header'); ownClass(more,'live-home-new-nav');
        const keep = [home.closest('a') || home, avatar, search.closest('.search-block') || search];
        const trim = node => { for (const child of node.children) {
          if (child.classList.contains('live-home-more-trigger')) continue;
          const retained = keep.some(item => child.contains(item)); fit([child], retained ? 1 : 0);
          if (retained && !keep.includes(child)) trim(child);
        }};
        trim(navbar);
      }
      if (liveNavigation.has(more)) {
        if (homeFont) liveNavigation.get(more).button.style.setProperty('font', homeFont, 'important');
        continue;
      }
      const owner = {navbar,wrapper,button:null};
      const button = liveMenuButton('更多 ▾', 'live-home-more-trigger', () => {
        if (liveMenuOwner === owner && !liveMenu.hidden) closeLiveMenu(); else openLiveMenu(owner, true);
      });
      // Match the native Home text, including site font rules that target buttons separately.
      if (homeFont) button.style.setProperty('font', homeFont, 'important');
      owner.button = button; button.setAttribute('aria-expanded','false'); button.setAttribute('aria-controls',liveMenu.id);
      button.addEventListener('pointerenter', () => { clearTimeout(liveMenuTimer); liveMenuTimer = setTimeout(() => openLiveMenu(owner), 120); }, {signal:signal});
      button.addEventListener('pointerleave', deferCloseLiveMenu, {signal:signal});
      button.addEventListener('keydown', event => { if (event.key === 'ArrowDown') { event.preventDefault(); openLiveMenu(owner,true); } }, {signal:signal});
      if (!modern) ownClass(more,'live-home-menu-host');
      more.append(button); liveNavigation.set(more,owner);
    }
    if (liveMenuOwner) positionLiveMenu();
    for (const [sidebar,button] of liveSidebar) if (!sidebar.isConnected) { button.remove(); liveSidebar.delete(sidebar); }
    for (const sidebar of includeSidebar ? document.querySelectorAll('.live-sidebar-ctnr') : []) {
      if (liveSidebar.has(sidebar)) continue;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'live-home-sidebar-toggle';
      const setExpanded = expanded => {
        ownClass(sidebar,'live-home-sidebar-collapsed',!expanded); button.textContent = expanded ? '收起工具栏' : '展开工具栏'; button.setAttribute('aria-expanded', String(expanded));
      };
      setExpanded(false); button.addEventListener('click', () => setExpanded(button.getAttribute('aria-expanded') !== 'true'), {signal:signal});
      sidebar.before(button); liveSidebar.set(sidebar,button);
    }
  }
  return {update:fitLiveNavigation, contains:node => liveMenu.contains(node),
    destroy() { restoreLiveNavigation(); restoreLiveSidebar(); }};
}
