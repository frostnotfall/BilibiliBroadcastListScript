import {urlOf} from '../urls.js';

function readLiveHeaderItems(navbar) {
  const itemOf = node => {
    const label = (node.querySelector('.label,.nav-title__label') || node).textContent.trim();
    const link = node.matches('.waterfall-item') ? node.querySelector('a') : node.closest('a') || node.querySelector('a[href]');
    return {label, href:link?.getAttribute('href'), source:link || node,
      children:Array.from(node.querySelectorAll('.area-list a,.absolute a')).map(child => ({
        label:child.textContent.trim(), href:child.getAttribute('href'), source:child,
      }))};
  };
  const dom = Array.from(navbar.querySelectorAll('.nav-items-ctnr .nav-item,.showmore-link .waterfall-item,.nav-title')).map(itemOf);
  // Read only the public navigation prop. The responsive waterfall omits area
  // menus from the DOM, but navItems retains their original order and areaList.
  let native;
  try { native = navbar.__vue__?.$props?.navItems; } catch { /* Other header generations use the DOM fallback. */ }
  const items = Array.isArray(native) && native.length ? native.map(item => {
    const fallback = dom.find(entry => entry.label === item.label), areas = item.propData?.areaList;
    return {label:item.label, href:item.href, source:fallback?.source,
      children:Array.isArray(areas) ? areas.filter(area => area.label && area.link).map(area => ({label:area.label, href:area.link})) : fallback?.children || []};
  }) : dom;
  if (!native?.length && navbar.querySelector('.nav-title')) {
    for (const group of document.querySelectorAll('#app nav.flex-nowrap > .group')) {
      const entry = itemOf(group), anchor = group.querySelector('a');
      entry.label = anchor?.textContent.trim() || entry.label; items.push(entry);
    }
  }
  const seen = new Set(['首页', '直播']);
  return items.filter(item => {
    if (typeof item.label !== 'string' || !item.label.trim() || seen.has(item.label)) return false;
    seen.add(item.label); return true;
  });
}

export function createLiveHeaderMenus({html, narrow, signal, ownClass, fit,
  rememberAttribute, restoreAttribute, setProperty, restoreProperty}) {
  const owners = new Map(), panel = document.createElement('div');
  panel.id = 'live-home-more-menu'; panel.hidden = true; panel.setAttribute('aria-label', '更多直播分区');
  const primary = document.createElement('div'), secondary = document.createElement('div');
  primary.className = 'broadcast-live-menu-grid'; secondary.className = 'broadcast-live-submenu';
  secondary.hidden = true; panel.append(primary, secondary);
  let active = null, selected = null, renderEvents = new AbortController();
  const listen = (node, type, fn, s = signal) => node.addEventListener(type, fn, {signal:s});
  function button(label, className) {
    const node = document.createElement('button'); node.type = 'button'; node.textContent = label; node.className = className; return node;
  }
  function link(item) {
    const url = item.href && urlOf(item.href), node = url ? document.createElement('a') : button(item.label, '');
    node.textContent = item.label; node.className = 'broadcast-live-menu-link';
    if (url) { node.href = url.href; node.target = '_self'; }
    else if (item.source) listen(node, 'click', () => { close(); item.source.click(); }, renderEvents.signal);
    else node.disabled = true;
    return node;
  }
  function position() {
    if (!active || panel.hidden) return;
    const anchor = active.trigger.getBoundingClientRect();
    const bottom = Math.max(anchor.bottom, active.navbar.getBoundingClientRect().bottom);
    const ceiling = parseFloat(getComputedStyle(html).getPropertyValue('--broadcast-navigation-height')) || 0;
    panel.style.maxWidth = Math.max(0, html.clientWidth - 16) + 'px';
    panel.style.maxHeight = Math.max(0, innerHeight - ceiling - 16) + 'px';
    const box = panel.getBoundingClientRect(), below = innerHeight - bottom - 16;
    const top = box.height <= below || anchor.top - ceiling < below
      ? Math.max(ceiling + 8, Math.min(bottom + 6, innerHeight - box.height - 8))
      : Math.max(ceiling + 8, anchor.top - box.height - 6);
    panel.style.left = Math.max(8, Math.min(anchor.left, html.clientWidth - box.width - 8)) + 'px'; panel.style.top = top + 'px';
    positionChild();
  }
  function positionChild() {
    if (!active || !selected || secondary.hidden || panel.hidden) return;
    const anchor = selected.closest('.broadcast-live-menu-cell').getBoundingClientRect();
    const ceiling = Math.max(active.navbar.getBoundingClientRect().bottom + 6,
      (parseFloat(getComputedStyle(html).getPropertyValue('--broadcast-navigation-height')) || 0) + 8);
    const room = Math.max(anchor.left - 8, html.clientWidth - anchor.right - 8);
    secondary.style.width = Math.max(96, Math.min(200, room)) + 'px';
    secondary.classList.toggle('broadcast-live-submenu-narrow', room < 160);
    secondary.style.maxWidth = Math.max(0, html.clientWidth - 16) + 'px';
    secondary.style.maxHeight = Math.max(0, innerHeight - ceiling - 8) + 'px';
    const box = secondary.getBoundingClientRect();
    // Keep the source button and its collapse arrow exposed on either side.
    const left = anchor.right + box.width <= html.clientWidth - 8 ? anchor.right : anchor.left - box.width;
    secondary.style.left = Math.max(8, Math.min(left, html.clientWidth - box.width - 8)) + 'px';
    secondary.style.top = Math.max(ceiling, Math.min((anchor.top + anchor.bottom - box.height) / 2, innerHeight - box.height - 8)) + 'px';
  }
  function collapseChild(focus = false) {
    const previous = selected; selected = null; secondary.hidden = true; secondary.replaceChildren();
    if (previous) categoryState(previous, false);
    if (focus) previous?.focus({preventScroll:true});
  }
  function categoryState(trigger, expanded) {
    trigger.setAttribute('aria-expanded', String(expanded));
    trigger.setAttribute('aria-label', (expanded ? '收起' : '展开') + trigger.dataset.category + '子菜单');
    trigger.querySelector('.broadcast-live-submenu-trigger').textContent = expanded ? '<' : '>';
  }
  function expandChild(item, trigger) {
    if (selected !== trigger) {
      collapseChild(); selected = trigger;
      const all = link({...item, label:'全部' + item.label}); all.classList.add('broadcast-live-submenu-all');
      const grid = document.createElement('div'); grid.className = 'broadcast-live-submenu-grid';
      for (const child of item.children) grid.append(link(child));
      secondary.replaceChildren(all, grid); secondary.hidden = false; categoryState(trigger, true);
      positionChild();
    }
  }
  function render() {
    renderEvents.abort(); renderEvents = new AbortController();
    primary.replaceChildren();
    for (const item of readLiveHeaderItems(active.navbar)) {
      const cell = document.createElement('div'); cell.className = 'broadcast-live-menu-cell';
      if (item.children.length) {
        const trigger = button('', 'broadcast-live-menu-link broadcast-live-category-trigger');
        const label = document.createElement('span'), arrow = document.createElement('span');
        label.textContent = item.label; arrow.className = 'broadcast-live-submenu-trigger'; arrow.setAttribute('aria-hidden', 'true');
        trigger.dataset.category = item.label; trigger.append(label, arrow); categoryState(trigger, false); cell.append(trigger);
        listen(trigger, 'click', () => { if (selected === trigger) collapseChild(); else expandChild(item, trigger); }, renderEvents.signal);
      } else cell.append(link(item));
      primary.append(cell);
    }
  }
  function close(focus = false) {
    const previous = active; collapseChild(); active = null; panel.hidden = true;
    previous?.trigger.setAttribute('aria-expanded', 'false'); if (focus) previous?.trigger.focus({preventScroll:true});
  }
  function open(owner) {
    if (active !== owner || panel.hidden) {
      close(); active = owner; render(); if (!panel.isConnected) document.body.append(panel);
      panel.hidden = false; owner.trigger.setAttribute('aria-expanded', 'true'); position();
    }
  }
  listen(panel, 'click', event => { if (event.target.closest('a[href]')) close(); });
  document.addEventListener('pointerdown', event => { if (active && !panel.contains(event.target) && !active.host.contains(event.target)) close(); }, {capture:true, signal});
  document.addEventListener('keydown', event => {
    if (!active) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); if (selected) collapseChild(true); else close(true);
    }
  }, {capture:true, signal});
  document.addEventListener('scroll', event => { if (panel.contains(event.target)) positionChild(); else close(); }, {capture:true, passive:true, signal});

  function fitNativePanel(owner) {
    const livePanel = owner.live.querySelector('.area-list-panel'); if (!livePanel) return;
    if (owner.livePanel !== livePanel) {
      owner.watch?.disconnect(); owner.resize?.disconnect(); owner.livePanel = livePanel;
      owner.watch = new MutationObserver(() => fitNativePanel(owner));
      owner.watch.observe(livePanel, {attributes:true, attributeFilter:['style'], childList:true, subtree:true});
      owner.resize = new ResizeObserver(() => fitNativePanel(owner)); owner.resize.observe(livePanel);
    }
    const anchor = owner.live.getBoundingClientRect(), box = livePanel.getBoundingClientRect();
    const ceiling = parseFloat(getComputedStyle(html).getPropertyValue('--broadcast-navigation-height')) || 0;
    const bottom = Math.max(anchor.bottom, owner.navbar.getBoundingClientRect().bottom);
    const top = Math.max(ceiling + 8, Math.min(bottom + 6, innerHeight - box.height - 8));
    setProperty(owner.live, '--broadcast-live-panel-left', Math.max(8, Math.min(anchor.left, html.clientWidth - box.width - 8)) + 'px');
    setProperty(owner.live, '--broadcast-live-panel-top', top + 'px');
    setProperty(owner.live, '--broadcast-live-panel-height', Math.max(0, innerHeight - top - 8) + 'px');
  }
  function release(navbar, owner) {
    if (active === owner) close(); owner.events.abort(); owner.watch?.disconnect(); owner.resize?.disconnect();
    for (const attr of ['tabindex','role','aria-expanded','aria-controls']) restoreAttribute(owner.trigger, attr);
    ownClass(owner.host, 'broadcast-live-more-host', false);
    for (const prop of ['--broadcast-live-font','--broadcast-live-font-size','--broadcast-live-font-weight']) restoreProperty(owner.host, prop);
    if (owner.created) owner.host.remove(); ownClass(owner.live, 'live-home-live-entry', false);
    for (const prop of ['--broadcast-live-panel-left','--broadcast-live-panel-top','--broadcast-live-panel-height']) restoreProperty(owner.live, prop);
    if (owner.marker) { if (owner.live.isConnected || !owner.marker.isConnected) owner.marker.replaceWith(owner.live); else owner.marker.remove(); }
    if (owner.titles) ownClass(owner.titles, 'live-home-new-nav', false);
    if (owner.wrapper) ownClass(owner.wrapper, 'live-home-new-header', false); owners.delete(navbar);
  }
  function attach(navbar, live, titles, wrapper) {
    let host = navbar.querySelector('.showmore-link'); const created = !host;
    if (created) {
      host = document.createElement('div'); host.className = 'showmore-link';
      const trigger = button('更多', 'broadcast-live-more-trigger'), arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden','true'); trigger.append(arrow); host.append(trigger); (titles || live.parentElement).append(host);
    }
    const trigger = host.querySelector(':scope > a,:scope > button') || host;
    const owner = {navbar, live, host, trigger, created, titles, wrapper, events:new AbortController(), marker:null};
    if (!titles) { owner.marker = document.createComment('native live entry'); live.before(owner.marker); host.before(live); }
    ownClass(live, 'live-home-live-entry'); ownClass(host, 'broadcast-live-more-host');
    rememberAttribute(trigger, 'tabindex', '0'); if (trigger.tagName !== 'BUTTON') rememberAttribute(trigger, 'role', 'button');
    rememberAttribute(trigger, 'aria-expanded', 'false'); rememberAttribute(trigger, 'aria-controls', panel.id);
    const s = owner.events.signal;
    host.addEventListener('click', event => {
      // DOM-only headers may expose a category through its original callback.
      // Let those hidden waterfall entries receive a forwarded native click.
      if (event.target.closest('.slot-ctnr')) return;
      event.preventDefault(); event.stopImmediatePropagation(); if (active === owner && !panel.hidden) close(); else open(owner);
    }, {capture:true, signal:s});
    trigger.addEventListener('keydown', event => {
      if (event.target !== trigger || !['Enter',' ','ArrowDown'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      if (event.key !== 'ArrowDown' && active === owner && !panel.hidden) close();
      else open(owner);
      if (event.key === 'ArrowDown') primary.querySelector('a,button')?.focus({preventScroll:true});
    }, {signal:s});
    owners.set(navbar, owner); return owner;
  }
  function update() {
    for (const [navbar, owner] of owners) if (!narrow.matches || !navbar.isConnected || !navbar.contains(owner.live) || !navbar.contains(owner.host) || !owner.host.contains(owner.trigger)) release(navbar, owner);
    if (!narrow.matches) { close(); panel.remove(); return; }
    for (const navbar of document.querySelectorAll('.link-navbar')) {
      const wrapper = navbar.closest('[class~="relative"][class~="z-100"][class~="h-64px"][class~="w-full"][class~="shrink-0"]');
      const titles = wrapper && navbar.querySelector('.nav-titles');
      const live = owners.get(navbar)?.live || Array.from(navbar.querySelectorAll(titles ? '.nav-title' : '.nav-items-ctnr .nav-item'))
        .find(node => (node.querySelector('.label,.nav-title__label') || node).textContent.trim() === '直播');
      if (!live) continue;
      const entry = live.closest('a') || live, owner = owners.get(navbar) || attach(navbar, entry, titles, wrapper);
      if (titles) {
        ownClass(wrapper, 'live-home-new-header'); ownClass(titles, 'live-home-new-nav');
        const keep = [entry, owner.host, navbar.querySelector('.user-panel.dp-table'), navbar.querySelector('.search-block')].filter(Boolean);
        const trim = node => { for (const child of node.children) {
          const retained = keep.some(item => child.contains(item)); fit([child], retained ? 1 : 0); if (retained && !keep.includes(child)) trim(child);
        }}; trim(navbar);
      }
      const font = getComputedStyle(entry.querySelector('.label,.nav-title__label') || entry);
      setProperty(owner.host, '--broadcast-live-font', font.fontFamily); setProperty(owner.host, '--broadcast-live-font-size', font.fontSize);
      setProperty(owner.host, '--broadcast-live-font-weight', font.fontWeight);
      fitNativePanel(owner);
    }
    position();
  }
  return {update, contains:node => panel.contains(node), destroy() {
    close(); renderEvents.abort(); for (const [navbar, owner] of owners) release(navbar, owner); panel.remove();
  }};
}
