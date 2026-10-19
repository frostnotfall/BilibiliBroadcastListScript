import css from './edge-panels.css';
// Collapse native sidebars without cloning or reparenting interactive content.
export function createEdgePanels({prefix, popup = '[role="dialog"],[role="tooltip"]', scrollRegions = {}}) {
  const states = new Map(), events = new AbortController();
  const style = Object.assign(document.createElement('style'), {textContent:css});
  let active = null;
  function syncScrollRegion(name, state) {
    const region = scrollRegions[name] ? state.element.querySelector(scrollRegions[name]) : null;
    if (region === state.scrollRegion) return;
    if (state.scrollRegion && !state.hadScrollClass) state.scrollRegion.classList.remove('edge-panel-scroll');
    state.scrollRegion = region;
    state.hadScrollClass = region?.classList.contains('edge-panel-scroll');
    region?.classList.add('edge-panel-scroll');
  }
  function setOpen(side) {
    active = side;
    for (const [name, state] of states) {
      const open = side === name;
      state.element.classList.toggle('edge-panel-open', open); state.element.inert = !open;
      state.button.setAttribute('aria-expanded', String(open));
      state.button.textContent = name === 'left' ? open ? '‹' : '›' : open ? '›' : '‹';
      state.button.title = `${open ? '收起' : '展开'}${state.label}`;
    }
  }
  function release(name) {
    const state = states.get(name);
    state.events.abort();
    if (state.scrollRegion && !state.hadScrollClass) state.scrollRegion.classList.remove('edge-panel-scroll');
    state.element.inert = state.inert;
    state.element.classList.remove('edge-panel', `edge-panel-${name}`, 'edge-panel-open');
    if (!state.id) state.element.removeAttribute('id');
    state.rail.remove(); states.delete(name);
    if (active === name) active = null;
  }
  function sync(elements) {
    if (!style.isConnected) document.head.append(style);
    for (const name of ['left','right']) {
      const element = elements[name];
      if (states.has(name) && states.get(name).element === element) { syncScrollRegion(name, states.get(name)); continue; }
      if (states.has(name)) release(name);
      if (!element) continue;
      const label = name === 'left' ? '个人信息与直播列表' : '社区与热搜';
      const controlEvents = new AbortController();
      const rail = Object.assign(document.createElement('div'), {id:name === 'left' ? `${prefix}-rail` : `${prefix}-right-rail`, className:`edge-rail edge-rail-${name}`});
      const button = Object.assign(document.createElement('button'), {id:name === 'left' ? `${prefix}-toggle` : `${prefix}-right-toggle`, type:'button'});
      const id = element.getAttribute('id');
      if (!id) {
        let value = `${prefix}-${name}-panel`; while (document.getElementById(value)) value += '-';
        element.id = value;
      }
      button.setAttribute('data-edge-control', ''); button.setAttribute('aria-controls', element.id);
      button.setAttribute('aria-label', label);
      button.addEventListener('click', () => setOpen(active === name ? null : name), {signal:controlEvents.signal});
      const state = {element, rail, button, label, id, inert:element.inert, events:controlEvents};
      states.set(name, state); syncScrollRegion(name, state);
      element.classList.add('edge-panel', `edge-panel-${name}`);
      rail.append(button); document.body.append(rail);
    }
    setOpen(active);
  }
  // Native dynamic/image cards stop click bubbling, even in their empty area.
  // Observe before page handlers (including delegated media opening) consume it.
  window.addEventListener('click', event => {
    // The outer five pixels on either edge never toggle or dismiss a panel.
    if (event.detail && (event.clientX < 5 || event.clientX >= document.documentElement.clientWidth - 5)) return;
    if (!active || !(event.target instanceof Element)) return;
    // Menus can live in a shadow root and stop bubbling themselves. Their
    // controls still belong to the open panel's interaction, wherever mounted.
    if (event.composedPath().some(node => node instanceof Element && node.matches(
      `[data-edge-control],#broadcast-media-menu,#broadcast-external-dialog,${popup}`))) return;
    if (!states.get(active).element.contains(event.target)) setOpen(null);
  }, {capture:true, signal:events.signal});
  document.addEventListener('keydown', event => {
    if (active && event.key === 'Escape') { const button = states.get(active).button; setOpen(null); button.focus(); }
  }, {signal:events.signal});
  const clear = () => { for (const name of [...states.keys()]) release(name); style.remove(); };
  return {sync, clear, destroy() {events.abort(); clear();}};
}
