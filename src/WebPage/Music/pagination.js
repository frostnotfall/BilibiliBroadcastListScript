const sections = '#app > [class*="_newMusic_"],#app > [class*="_hotRank_"],#app > [class*="_reviews_"]';
const floors = '[class*="_first-floor_"],[class*="_second-floor_"]';
const actionAttribute = 'data-musicscript-page-action';

// Reuse the native arrows, counter, cards and sliding rows. The site
// calculates desktop page sizes once, so narrow layouts own only pagination.
export function mountMusicPagination() {
  const narrow = matchMedia('(max-width:1099px)');
  const events = new AbortController();
  const states = new Map();
  let frame = 0, hoverFrame = 0, stopped = false;

  function remember(state, element, name, value) {
    let attributes = state.attributes.get(element);
    if (!attributes) state.attributes.set(element, attributes = new Map());
    if (!attributes.has(name)) attributes.set(name, {original:element.getAttribute(name), value});
    attributes.get(name).value = value;
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }

  function release(state) {
    resize.unobserve(state.container);
    for (const card of state.hidden) card.classList.remove('musicscript-page-out');
    for (const [card, original] of state.offsets) restoreOffset(card, original);
    for (const [element, attributes] of state.attributes) for (const [name, saved] of attributes) {
      if (element.getAttribute(name) !== saved.value) continue;
      if (saved.original === null) element.removeAttribute(name);
      else element.setAttribute(name, saved.original);
    }
    for (const [name, original] of state.variables) {
      if (original.value) state.section.style.setProperty(name, original.value, original.priority);
      else state.section.style.removeProperty(name);
    }
    state.section.classList.remove('musicscript-paged');
    state.count.remove();
  }

  function create(section, container, control) {
    const previous = control.querySelector('[class*="_headerControlLeft_"]');
    const next = control.querySelector('[class*="_headerControlRight_"]');
    if (!previous || !next) return null;
    const count = document.createElement('span');
    count.className = 'musicscript-page-count';
    count.setAttribute('aria-live', 'polite');
    control.insertBefore(count, next);
    const variables = new Map(['--musicscript-columns','--musicscript-page','--musicscript-cover-size',
      '--musicscript-hover-width','--musicscript-hover-height'].map(name => [name, {
      value:section.style.getPropertyValue(name), priority:section.style.getPropertyPriority(name),
    }]));
    const state = {section, container, control, previous, next, count, variables,
      attributes:new Map(), hidden:new Set(), offsets:new Map(), hovered:new Map(), animating:new Set(),
      columns:1, page:0, pages:1};
    for (const [element, direction, label] of [[previous,-1,'上一页'],[next,1,'下一页']]) {
      remember(state, element, actionAttribute, String(direction));
      remember(state, element, 'role', 'button');
      remember(state, element, 'tabindex', '0');
      remember(state, element, 'aria-label', label);
    }
    resize.observe(container);
    section.classList.add('musicscript-paged');
    return state;
  }

  function restoreOffset(card, original) {
    if (original.value) card.style.setProperty('--musicscript-hover-offset', original.value, original.priority);
    else card.style.removeProperty('--musicscript-hover-offset');
  }

  function setOffset(state, element, value) {
    if (!state.offsets.has(element)) state.offsets.set(element, {
      value:element.style.getPropertyValue('--musicscript-hover-offset'),
      priority:element.style.getPropertyPriority('--musicscript-hover-offset'),
    });
    if (element.style.getPropertyValue('--musicscript-hover-offset') !== value) {
      element.style.setProperty('--musicscript-hover-offset', value);
    }
  }

  function syncHover(state, row) {
    const active = [...row.children].find(card => card.matches('[class*="_expandItem_"]'));
    if (active) state.hovered.set(row, active);
    const card = state.hovered.get(row);
    if (!card || !row.contains(card)) { state.hovered.delete(row); return; }
    let offset = 0;
    if (parseFloat(card.style.getPropertyValue('--musicscript-hover-offset')) < 0) {
      const size = parseFloat(state.section.style.getPropertyValue('--musicscript-cover-size'));
      const index = [...row.children].indexOf(card);
      // Measure relative to the row so its previous shift cancels out. This
      // includes neighbouring cards that may still be finishing a transition.
      // Width is the single animation source: the right edge never jumps first.
      offset = Math.min(0, (index + 1) * size + index * 12
        - (card.getBoundingClientRect().right - row.getBoundingClientRect().left));
    }
    setOffset(state, row, `${offset}px`);
    const size = parseFloat(state.section.style.getPropertyValue('--musicscript-cover-size'));
    if (!active && Math.abs(card.getBoundingClientRect().width - size) < .02
      && ![...state.animating].some(item => item.parentElement === row)) state.hovered.delete(row);
  }

  function animateHover() {
    hoverFrame = 0;
    let running = false;
    for (const state of states.values()) {
      for (const row of state.hovered.keys()) if (row.isConnected) syncHover(state, row);
      if (state.animating.size || [...state.hovered.values()].some(card => {
        const name = card.matches('[class*="_expandItem_"]') ? '--musicscript-hover-width' : '--musicscript-cover-size';
        const target = parseFloat(state.section.style.getPropertyValue(name));
        return card.isConnected && Math.abs(card.getBoundingClientRect().width - target) >= .02;
      })) running = true;
    }
    if (!stopped && running) hoverFrame = requestAnimationFrame(animateHover);
  }

  function transition(event) {
    if (!narrow.matches || event.propertyName !== 'width' || !(event.target instanceof Element)) return;
    const card = event.target, row = card.parentElement;
    const state = row?.matches(floors) && states.get(card.closest(sections));
    if (!state || !state.offsets.has(card)) return;
    if (event.type === 'transitionrun') {
      state.animating.add(card);
      if (!state.hovered.has(row)) state.hovered.set(row, card);
      if (!hoverFrame) hoverFrame = requestAnimationFrame(animateHover);
    } else state.animating.delete(card);
    syncHover(state, row);
  }

  function render(state) {
    const rows = [...state.container.querySelectorAll(floors)];
    const width = state.container.clientWidth;
    const cardWidth = state.section.matches('[class*="_reviews_"]') ? 240 : 156;
    const columns = Math.max(1, Math.floor((width + 12) / (cardWidth + 12)));
    const first = state.page * state.columns;
    state.columns = columns;
    state.pages = Math.max(1, Math.ceil(Math.max(0, ...rows.map(row => row.children.length)) / columns));
    state.page = Math.min(state.pages - 1, Math.floor(first / columns));
    const coverSize = Math.max(0, (width - (columns - 1) * 12) / columns);
    const hoverWidth = Math.min(width, coverSize * 16 / 9);
    const properties = {'--musicscript-columns':String(columns), '--musicscript-page':String(state.page),
      '--musicscript-cover-size':`${coverSize}px`, '--musicscript-hover-width':`${hoverWidth}px`,
      '--musicscript-hover-height':`${hoverWidth * 9 / 16}px`};
    for (const [name, value] of Object.entries(properties)) {
      if (state.section.style.getPropertyValue(name) !== value) state.section.style.setProperty(name, value);
    }
    const label = `${state.page + 1} / ${state.pages}`;
    if (state.count.textContent !== label) state.count.textContent = label;
    remember(state, state.previous, 'aria-disabled', String(state.page === 0));
    remember(state, state.next, 'aria-disabled', String(state.page === state.pages - 1));
    const cards = new Set(rows.flatMap(row => [...row.children]));
    for (const card of state.hidden) if (!cards.has(card)) {
      card.classList.remove('musicscript-page-out'); state.hidden.delete(card);
    }
    for (const [card, original] of state.offsets) if (!cards.has(card) && !rows.includes(card)) {
      restoreOffset(card, original); state.offsets.delete(card);
    }
    for (const row of rows) [...row.children].forEach((card, index) => {
      // Keep native hover/player events and let expanded tracks push siblings.
      // Right-edge cards use their actual animated width to shift the row.
      if (card.querySelector(':scope > [class*="_inlineVideoSquare_"]')) {
        const offset = `${Math.min(0, width - hoverWidth - (index % columns) * (coverSize + 12))}px`;
        setOffset(state, card, offset);
      }
      const hidden = index < state.page * columns || index >= (state.page + 1) * columns;
      if (hidden && !card.classList.contains('musicscript-page-out')) {
        card.classList.add('musicscript-page-out'); state.hidden.add(card);
      } else if (!hidden && state.hidden.delete(card)) card.classList.remove('musicscript-page-out');
    });
    for (const card of state.animating) if (!cards.has(card)) state.animating.delete(card);
    for (const row of state.hovered.keys()) if (!rows.includes(row)) state.hovered.delete(row);
    for (const row of rows) syncHover(state, row);
    // Class changes precede transitionrun. Start tracking now so the first
    // shrinking frame is compensated too, and retain the anchor until settled.
    if (state.hovered.size && !hoverFrame) hoverFrame = requestAnimationFrame(animateHover);
  }

  function update() {
    frame = 0;
    for (const [section, state] of states) {
      if (!narrow.matches || !section.isConnected || !section.contains(state.control) || !section.contains(state.container)) {
        release(state); states.delete(section);
      }
    }
    if (!narrow.matches) return;
    for (const section of document.querySelectorAll(sections)) {
      // Only the direct list container, never a banner's internal carousel.
      const container = [...section.children].find(child => child.matches('[class*="_container_"]'))
        || section.querySelector(':scope > [class*="_main_"] > [class*="_container_"]');
      const control = section.querySelector(':scope > [class*="_header_"] > [class*="_headerControl_"]');
      if (!container || !control) continue;
      let state = states.get(section);
      if (!state) {
        state = create(section, container, control);
        if (!state) continue;
        states.set(section, state);
      }
      render(state);
    }
  }

  function schedule() { if (!stopped && !frame) frame = requestAnimationFrame(update); }
  function navigate(event) {
    if (!narrow.matches || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.type === 'click' && event.button !== 0) return;
    if (event.type === 'keydown' && !['Enter',' '].includes(event.key)) return;
    const button = event.target instanceof Element ? event.target.closest(`[${actionAttribute}]`) : null;
    const state = button && states.get(button.closest(sections));
    if (!state || (button !== state.previous && button !== state.next)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    state.page = Math.max(0, Math.min(state.pages - 1, state.page + Number(button.getAttribute(actionAttribute))));
    render(state);
  }
  const resize = new ResizeObserver(schedule);
  resize.observe(document.documentElement);
  const mutations = new MutationObserver(records => {
    if (records.some(record => record.type === 'childList'
      || record.target.matches?.('[style*="--musicscript-hover-offset"]'))) schedule();
  });
  mutations.observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['class']});
  narrow.addEventListener('change', schedule, {signal:events.signal});
  document.addEventListener('click', navigate, {capture:true, signal:events.signal});
  document.addEventListener('keydown', navigate, {capture:true, signal:events.signal});
  for (const type of ['transitionrun','transitionend','transitioncancel']) {
    document.addEventListener(type, transition, {capture:true, signal:events.signal});
  }
  update();
  return {destroy() {
    if (stopped) return;
    stopped = true; events.abort(); mutations.disconnect(); resize.disconnect();
    cancelAnimationFrame(frame); cancelAnimationFrame(hoverFrame);
    for (const state of states.values()) release(state);
    states.clear();
  }};
}
