import {mountCardHoverLayout} from '../../common/card-hover-layout.js';
import {mountRankingLayout} from './ranking-layout.js';
// Page-local controls. Keep native cards, links, previews and handlers in place.
export function mountAnimeContent() {
  const narrow = matchMedia('(max-width:1099px)');
  const events = new AbortController();
  const properties = new Map(), attributes = new Map(), rails = new Map(), timelines = new Map(), filters = new Map();
  const cards = mountCardHoverLayout({
    rowSelector:'.feenline-vcard-wrapper,.home-page-switch-wrapper .inner-content-body:has(> .hot-ranking-cell-wrapper):not(:has(.ranking-cell-index)),.timeline-common-content-list-container:not(.is-empty)',
    cardSelector:':scope > .hot-ranking-cell-wrapper,:scope > .timeline-weekday-item',
  });
  const rankings = mountRankingLayout();
  let frame = 0, stopped = false;
  function property(element, name, value) {
    let saved = properties.get(element);
    if (!saved) properties.set(element, saved = new Map());
    if (!saved.has(name)) saved.set(name, {value:element.style.getPropertyValue(name), priority:element.style.getPropertyPriority(name)});
    if (element.style.getPropertyValue(name) !== value) element.style.setProperty(name, value);
  }
  function attribute(element, name, value) {
    let saved = attributes.get(element);
    if (!saved) attributes.set(element, saved = new Map());
    if (!saved.has(name)) saved.set(name, element.getAttribute(name));
    if (value === null) element.removeAttribute(name);
    else if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }
  function expand(rail, open) {
    rail.wrapper.toggleAttribute('data-open', open);
    rail.button.textContent = open ? '›' : '‹';
    rail.button.setAttribute('aria-expanded', String(open));
    rail.button.setAttribute('aria-label', open ? '收起快捷导航' : '展开快捷导航');
    rail.button.title = rail.button.getAttribute('aria-label');
    rail.panel.inert = narrow.matches && !open;
  }
  function installRails() {
    for (const panel of document.querySelectorAll('.nav-tool-container .nav-tool')) {
      if (rails.has(panel)) continue;
      const marker = document.createComment('Anime native navigation');
      const wrapper = document.createElement('div');wrapper.className = 'anime-sidebar';
      const button = document.createElement('button');button.type = 'button';button.className = 'anime-sidebar-toggle';
      const originalInert = panel.inert;
      panel.before(marker, wrapper);wrapper.append(button, panel);
      const rail = {marker, wrapper, button, panel, originalInert};rails.set(panel, rail);
      button.addEventListener('click', () => expand(rail, !wrapper.hasAttribute('data-open')), {signal:events.signal});
      expand(rail, false);
    }
    for (const rail of rails.values()) rail.panel.inert = narrow.matches ? !rail.wrapper.hasAttribute('data-open') : rail.originalInert;
  }
  function selectDay(container, state, index, scroll = false) {
    const heads = [...container.querySelectorAll('.tl-head')], bodies = [...container.querySelectorAll('.season-timeline')];
    state.index = Math.max(0, Math.min(index, heads.length - 1));
    heads.forEach((head,i) => {
      attribute(head, 'data-anime-selected', i === state.index ? '' : null);
      attribute(head, 'role', narrow.matches ? 'button' : attributes.get(head)?.get('role') ?? null);
      attribute(head, 'tabindex', narrow.matches ? '0' : attributes.get(head)?.get('tabindex') ?? null);
      attribute(head, 'aria-pressed', narrow.matches ? String(i === state.index) : null);
      attribute(head, 'aria-label', narrow.matches ? head.textContent.trim().replace(/\s+/g,' ') : null);
    });
    bodies.forEach((body,i) => attribute(body, 'data-anime-selected', i === state.index ? '' : null));
    if (scroll && heads[state.index]) {
      const viewport = container.querySelector('.tl-weeks'), head = heads[state.index];
      viewport.scrollLeft = Math.max(0, head.offsetLeft - (viewport.clientWidth - head.offsetWidth) / 2);
    }
  }
  function fitTimelines() {
    for (const container of document.querySelectorAll('#app .timeline-container')) {
      let state = timelines.get(container);
      if (!state) {
        state = {index:0, wasNarrow:false, ready:false};timelines.set(container,state);
        const choose = event => {
          if (!narrow.matches) return;
          const head = event.target.closest('.tl-head');
          if (!head || !container.contains(head)) return;
          if (event.type === 'keydown' && !['Enter',' '].includes(event.key)) return;
          if (event.type === 'keydown') event.preventDefault();
          selectDay(container,state,[...container.querySelectorAll('.tl-head')].indexOf(head),true);
        };
        container.addEventListener('click',choose,{signal:events.signal});
        container.addEventListener('keydown',choose,{signal:events.signal});
      }
      const heads = [...container.querySelectorAll('.tl-head')];
      if (!heads.length) continue;
      if (!state.ready) { state.index = Math.max(0, heads.findIndex(e=>e.querySelector('.today')));state.ready = true; }
      selectDay(container,state,state.index,narrow.matches && !state.wasNarrow);
      state.wasNarrow = narrow.matches;
    }
  }
  function fitFilters() {
    for (const list of document.querySelectorAll('.bangumi-index-wrapper .filter-item-wrapper')) {
      const button = list.querySelector('.btn-expand');
      if (!button) continue;
      const items = [...list.querySelectorAll(':scope > .filter-item')];
      if (!items.length) continue;
      let state = filters.get(list);
      if (!state) {
        // Native collapsed height is based on its fixed-width sidebar, not the responsive columns.
        state = {collapsed:button.textContent.trim() === '展开' ? parseFloat(list.style.height) || 300 : 300};
        filters.set(list,state);
      }
      if (!narrow.matches) continue;
      const top = Math.min(...items.map(item=>item.offsetTop));
      const height = Math.max(...items.map(item=>item.offsetTop + item.offsetHeight)) - top;
      const needed = height > state.collapsed;
      const expanded = button.textContent.trim() === '收起';
      property(list,'--anime-filter-height',`${needed ? expanded ? height + 30 : state.collapsed : height}px`);
      attribute(button,'data-anime-filter-toggle',needed ? 'visible' : 'hidden');
    }
  }
  function update() {
    frame = 0;if (stopped) return;
    installRails();fitTimelines();fitFilters();
  }
  function schedule() { if (!stopped && !frame) frame = requestAnimationFrame(update); }
  const resize = new ResizeObserver(schedule);
  resize.observe(document.documentElement);
  const mutations = new MutationObserver(records => {
    if (records.some(r=>r.type === 'childList' || r.target.matches?.('.filter-item-wrapper') || r.type === 'characterData' && r.target.parentElement?.closest('.btn-expand'))) schedule();
  });
  mutations.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style'],characterData:true});
  narrow.addEventListener('change',schedule,{signal:events.signal});
  window.addEventListener('resize',schedule,{signal:events.signal});
  document.addEventListener('pointerdown',event=>{
    for (const rail of rails.values()) if (rail.wrapper.hasAttribute('data-open') && !rail.wrapper.contains(event.target)) expand(rail,false);
  },{signal:events.signal,passive:true});
  document.addEventListener('keydown',event=>{
    if (event.key !== 'Escape') return;
    for (const rail of rails.values()) if (rail.wrapper.hasAttribute('data-open')) {expand(rail,false);rail.button.focus();}
  },{signal:events.signal});
  update();
  return {destroy() {
    cards.destroy();
    rankings.destroy();
    stopped = true;events.abort();mutations.disconnect();resize.disconnect();cancelAnimationFrame(frame);
    for (const rail of rails.values()) {
      rail.panel.inert = rail.originalInert;
      if (rail.marker.parentNode) rail.marker.replaceWith(rail.panel);
      rail.wrapper.remove();
    }
    for (const [element,saved] of properties) for (const [name,original] of saved) {
      if (original.value) element.style.setProperty(name,original.value,original.priority);else element.style.removeProperty(name);
    }
    for (const [element,saved] of attributes) for (const [name,value] of saved) {
      if (value === null) element.removeAttribute(name);else element.setAttribute(name,value);
    }
  }};
}
