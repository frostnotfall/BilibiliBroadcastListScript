import {expandedRowOffset} from './card-hover-motion.js';

// The page adapter changes only the native component's page-size input.
// Buttons, rendering, navigation and hover/player handlers remain native.
export function mountNativeSingleRows({selector, describe}) {
  const narrow = matchMedia('(max-width:1099px)'), events = new AbortController();
  const states = new Map();
  let frame = 0, motionFrame = 0, stopped = false;
  function property(state, element, name, value) {
    let saved = state.properties.get(element);
    if (!saved) state.properties.set(element, saved = new Map());
    if (!saved.has(name)) saved.set(name, {value:element.style.getPropertyValue(name), priority:element.style.getPropertyPriority(name)});
    if (element.style.getPropertyValue(name) !== value) element.style.setProperty(name, value);
  }
  function attribute(state, element, name) {
    let saved = state.attributes.get(element);
    if (!saved) state.attributes.set(element, saved = new Map());
    if (!saved.has(name)) saved.set(name, element.getAttribute(name));
    if (!element.hasAttribute(name)) element.setAttribute(name, '');
  }
  function restoreGeometry(state) {
    resize.unobserve(state.row);
    for (const [element, saved] of state.properties) for (const [name, original] of saved) {
      if (original.value) element.style.setProperty(name, original.value, original.priority);
      else element.style.removeProperty(name);
    }
    for (const [element, saved] of state.attributes) for (const [name, original] of saved) {
      if (original === null) element.removeAttribute(name); else element.setAttribute(name, original);
    }
    state.properties.clear();state.attributes.clear();state.hovered = null;
  }
  function release(state) {
    restoreGeometry(state);
    state.adapter.destroy();
  }
  function hover(state) {
    const cards = [...state.row.children].filter(card=>card.matches(state.cardSelector));
    const active = cards.find(card => card.matches(state.activeSelector));
    if (active) state.hovered = active;
    const card = state.hovered;
    if (!card || !state.row.contains(card)) {
      state.hovered = null;
      property(state, state.row, '--single-row-hover-offset', '0px');
      return false;
    }
    const index = cards.indexOf(card), rect = card.getBoundingClientRect(), width = rect.width;
    // A neighbouring card may still be shrinking when the next one expands.
    const priorExpansion = rect.left - state.row.getBoundingClientRect().left
      - (parseFloat(getComputedStyle(card).left) || 0) - index * (state.cell + state.gap);
    const offset = expandedRowOffset({rowWidth:state.width, cardWidth:state.cell, expandedWidth:width,
      index, gap:state.gap, priorExpansion, center:cards.length === state.columns});
    property(state, state.row, '--single-row-hover-offset', `${offset}px`);
    const target = active ? state.expanded : state.cell;
    const running = Math.abs(width - target) > .05;
    if (!active && !running) state.hovered = null;
    return running;
  }
  function animate() {
    motionFrame = 0;
    let running = false;
    for (const state of states.values()) if (hover(state)) running = true;
    if (!stopped && running) motionFrame = requestAnimationFrame(animate);
  }
  function update() {
    frame = 0;if (stopped) return;
    const candidates = new Map([...document.querySelectorAll(selector)].map(row=>[row.parentElement,row]));
    for (const [container,state] of states) if (!narrow.matches || !candidates.has(container) || !state.valid()) {
      release(state);states.delete(container);
    }
    if (!narrow.matches) return;
    for (const [container,row] of candidates) {
      let state = states.get(container);
      if (!state) {
        const description = describe(row, schedule);
        if (!description) continue;
        state = {...description,row,properties:new Map(),attributes:new Map(),hovered:null};
        states.set(container,state);resize.observe(row);
      } else if (state.row !== row) {
        // Vue can recycle a previous row div into an arrow or placeholder.
        // Transfer geometry to the new row, retaining one page-size adapter.
        restoreGeometry(state);state.row = row;resize.observe(row);
      }
      const width = row.clientWidth;
      if (!width) continue;
      const columns = Math.max(1,Math.floor((width + state.gap) / (state.minWidth + state.gap)));
      state.width = width;state.columns = columns;
      state.cell = (width - (columns - 1) * state.gap) / columns;
      state.expanded = Math.min(width, state.cell * 2 + state.gap);
      attribute(state,row,'data-native-single-row');
      attribute(state,state.container,'data-native-single-row-container');
      property(state,row,'--single-row-gap',`${state.gap}px`);
      property(state,row,'--single-row-card-width',`${state.cell}px`);
      property(state,row,'--single-row-expanded-width',`${state.expanded}px`);
      property(state,row,'--single-row-cover-height',`${state.cell * state.coverRatio}px`);
      state.adapter.resize(columns);
      hover(state);
    }
    if (!motionFrame) motionFrame = requestAnimationFrame(animate);
  }
  function schedule() {if (!stopped && !frame) frame = requestAnimationFrame(update);}
  const resize = new ResizeObserver(schedule);resize.observe(document.documentElement);
  const mutations = new MutationObserver(records => {
    if (records.some(record => record.type === 'childList' || record.attributeName === 'class')) schedule();
  });
  mutations.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  narrow.addEventListener('change',schedule,{signal:events.signal});
  window.addEventListener('resize',schedule,{signal:events.signal});
  for (const type of ['transitionrun','transitionend','transitioncancel']) document.addEventListener(type,event=>{
    if (!['flex-basis','flex-grow','width'].includes(event.propertyName)
        || ![...states.values()].some(state=>state.row === event.target.parentElement)) return;
    if (!motionFrame) motionFrame = requestAnimationFrame(animate);
  },{capture:true,signal:events.signal});
  update();
  return {destroy() {
    stopped = true;events.abort();resize.disconnect();mutations.disconnect();
    cancelAnimationFrame(frame);cancelAnimationFrame(motionFrame);
    for (const state of states.values()) release(state);
    states.clear();
  }};
}
