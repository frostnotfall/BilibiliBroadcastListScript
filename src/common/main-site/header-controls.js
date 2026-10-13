// Keep complete native controls, including lazily mounted popovers and handlers.
export function fitHomeHeader(hidden, fit) {
  for (const bar of document.querySelectorAll('.bili-header__bar')) {
    const keep = Array.from(bar.querySelectorAll('.home-page-entry,.home-page-panel-entry,.header-avatar-wrap,.header-avatar-unlogin-wrap,.favorite-entry,.history-entry,.right-entry__item:has([data-idx="fav"]),.right-entry__item:has([data-idx="history"])'));
    for (const link of bar.querySelectorAll('a[href]')) {
      if (link.closest('.v-popover')) continue;
      const url = new URL(link.href, location.href);
      const home = url.hostname === 'www.bilibili.com' && /^\/(?:index\.html)?$/.test(url.pathname);
      const personal = url.hostname === 'www.bilibili.com' && /^\/history\/?$/.test(url.pathname)
        || url.hostname === 'space.bilibili.com' && /^\/\d+\/(?:favlist|fav)(?:\/|$)/.test(url.pathname);
      if (home || personal || link.hasAttribute('data-header-fav-entry')) {
        keep.push(link.closest('.right-entry__item,.v-popover-wrap') || link);
      }
    }
    const form = bar.querySelector('#nav-searchform,#nav_searchform');
    const search = bar.querySelector('.center-search-container') || form?.closest('.menu-center') || form;
    if (search) keep.push(search);
    if (!keep.length) continue;
    for (const element of hidden) if (bar.contains(element) && keep.some(node => node.contains(element))) fit([element], 1);
    function trim(container) {
      for (const child of container.children) {
        const retained = keep.some(node => child.contains(node));
        fit([child], retained ? 1 : 0);
        if (retained && !keep.includes(child)) trim(child);
      }
    }
    trim(bar);
  }
}

export function createHeaderCards() {
  const html = document.documentElement;
  const narrow = matchMedia('(max-width:1099px)');
  const scope = '.bili-header__bar';
  const controls = '.favorite-entry,.history-entry,.right-entry__item:has([data-idx="fav"]),.right-entry__item:has([data-idx="history"])';
  const properties = ['--homepagescript-card-left','--homepagescript-card-top','--homepagescript-card-height','--homepagescript-card-width','--homepagescript-card-compact-width'];
  const saved = new Map(), observed = new Set(), events = new AbortController();
  let frame = 0, stopped = false;
  function restore(element, state) {
    element.classList.remove('homepagescript-header-card');
    for (const [name, original] of state.original) {
      if (original.value) element.style.setProperty(name, original.value, original.priority);
      else element.style.removeProperty(name);
    }
  }
  function update() {
    frame = 0;
    const targets = new Set(), cards = new Set();
    for (const control of document.querySelectorAll(`${scope} :is(${controls})`)) {
      targets.add(control);
      const anchor = control.querySelector('.right-entry__item-trigger,a');
      if (!anchor) continue;
      targets.add(anchor);
      const popups = control.querySelectorAll('.v-popover-wrap > .v-popover');
      for (const popup of popups) {
        cards.add(popup); targets.add(popup);
        if (!narrow.matches) continue;
        let state = saved.get(popup);
        if (!state) {
          state = {original:new Map(properties.map(name => [name, {value:popup.style.getPropertyValue(name),priority:popup.style.getPropertyPriority(name)}]))};
          saved.set(popup, state);
        }
        const favorite = popup.querySelector('.favorite-panel-popover');
        if (favorite && !state.nativeCompactWidth) {
          // Read before applying our layout so the site's own folder/content
          // widths (and its enclosing border) remain the source of truth.
          // This also handles a login panel being replaced by lazy content.
          popup.classList.remove('homepagescript-header-card');
          const edges = element => {
            const css = getComputedStyle(element);
            return ['paddingLeft','paddingRight','borderLeftWidth','borderRightWidth'].reduce((sum, name) => sum + (parseFloat(css[name]) || 0), 0);
          };
          const content = favorite.closest('.v-popover-content');
          const css = getComputedStyle(favorite);
          const nativeWidth = element => {
            const style = getComputedStyle(element);
            return element.offsetWidth || (parseFloat(style.width) || 0) + (style.boxSizing === 'border-box' ? 0 : edges(element));
          };
          const shellWidth = (content ? edges(content) : 0) + edges(popup);
          const panelWidth = nativeWidth(favorite);
          state.nativeWidth = popup.offsetWidth || panelWidth + shellWidth;
          const list = favorite.querySelector('.favorite-panel-popover__content');
          const folders = favorite.querySelector('.favorite-panel-popover__nav');
          // The horizontal layout replaces the folder column. Its card width
          // must therefore follow the native video list, not the entire panel.
          const listWidth = list && (nativeWidth(list) || Math.max(0, panelWidth - edges(favorite) - (folders ? nativeWidth(folders) : 0) - (parseFloat(css.columnGap) || 0)));
          state.nativeCompactWidth = listWidth ? listWidth + edges(favorite) + shellWidth : 0;
          if (state.nativeWidth > 0) popup.style.setProperty('--homepagescript-card-width', `${state.nativeWidth}px`);
          if (state.nativeCompactWidth > 0) popup.style.setProperty('--homepagescript-card-compact-width', `${state.nativeCompactWidth}px`);
        }
        if (!popup.classList.contains('homepagescript-header-card')) popup.classList.add('homepagescript-header-card');
        const rect = anchor.getBoundingClientRect();
        const inset = parseFloat(getComputedStyle(html).getPropertyValue('--broadcast-navigation-height')) || 0;
        const top = Math.max(inset, Math.min(rect.bottom, innerHeight - 8));
        const width = popup.getBoundingClientRect().width;
        const left = Math.max(8, Math.min(rect.right - width, html.clientWidth - width - 8));
        // Account for any zoom already applied to the page by its native layout.
        const scale = width / popup.offsetWidth || 1;
        const values = [`${left / scale}px`, `${top / scale}px`, `${Math.max(0, innerHeight - top - 8) / scale}px`];
        properties.slice(0, 3).forEach((name, index) => {
          if (popup.style.getPropertyValue(name) !== values[index]) popup.style.setProperty(name, values[index]);
        });
        state.style = popup.getAttribute('style');
      }
    }
    for (const [element, state] of saved) if (!narrow.matches || !cards.has(element)) {
      restore(element, state); saved.delete(element);
    }
    if (targets.size !== observed.size || [...targets].some(element => !observed.has(element))) {
      attributes.disconnect(); resize.disconnect(); observed.clear();
      for (const element of targets) {
        observed.add(element); resize.observe(element);
        attributes.observe(element, {attributes:true,attributeFilter:['class','style']});
      }
    }
  }
  function schedule() { if (!stopped && !frame) frame = requestAnimationFrame(update); }
  const resize = new ResizeObserver(schedule);
  const attributes = new MutationObserver(records => {
    if (records.some(record => record.attributeName !== 'style' || saved.get(record.target)?.style !== record.target.getAttribute('style'))) schedule();
  });
  const children = new MutationObserver(records => {
    if (records.some(record => record.target.closest?.(scope) || [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 && (node.matches(scope) || node.querySelector(scope))))) schedule();
  });
  children.observe(document.body, {childList:true,subtree:true});
  narrow.addEventListener('change', schedule, {signal:events.signal});
  window.addEventListener('resize', schedule, {signal:events.signal});
  document.addEventListener('scroll', schedule, {capture:true,passive:true,signal:events.signal});
  for (const type of ['pointerover','focusin']) document.addEventListener(type, event => {
    if (event.target.closest?.(scope)) schedule();
  }, {capture:true,signal:events.signal});
  update();
  return {destroy() {
    stopped = true; events.abort(); cancelAnimationFrame(frame);
    children.disconnect(); attributes.disconnect(); resize.disconnect();
    for (const [element, state] of saved) restore(element, state);
    saved.clear(); observed.clear();
  }};
}
