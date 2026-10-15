import css from './header-search-controls.css';

export function createHeaderSearchControls({signal}) {
  const panels = new Map();
  const headers = '.bili-header__bar,.mini-header,.international-header,.bili-header-m,.bili-mini-header,.b-header,.link-navbar,.charity-header,.search-fixed-header,.search-layout .search-input-container';
  const hosts = '.center-search-container,.search-block,.nav-search,.nav-search-box,.search-box,.search-container,.search-input-wrap';
  const selector = '.search-pannel,.search-panel,.nav-search-panel';
  const style = document.createElement('style');
  style.textContent = css; (document.head || document.documentElement).append(style);
  let frame = 0, stopped = false;

  function removeButton(state) {
    state.button?.remove();
    state.header?.classList.remove('broadcast-search-header');
    state.button = null; state.header = null;
  }
  function restore(panel, state) {
    removeButton(state); panel.classList.remove('broadcast-search-closed');
  }
  function update() {
    frame = 0;
    if (stopped) return;
    for (const [panel, state] of panels) {
      if (!panel.isConnected || !panel.closest(headers)) {
        restore(panel, state); panels.delete(panel); continue;
      }
      // Keep the closed state even when native updates temporarily remove headings.
      if (panel.querySelector('.header') !== state.header || !state.header?.contains(state.button)) removeButton(state);
    }
    for (const panel of document.querySelectorAll(selector)) {
      if (!panel.closest(headers)) continue;
      let state = panels.get(panel);
      if (!state) {
        state = {header:null, button:null, host:panel.closest(hosts) || panel.parentElement};
        panels.set(panel, state);
      }
      if (!state.button) {
        // History is optional: use the hot-search heading when history is empty.
        const header = panel.querySelector('.header');
        if (!header) continue;
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'broadcast-search-close';
        button.title = '关闭搜索卡片'; button.setAttribute('aria-label', '关闭搜索卡片');
        button.innerHTML = '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M1 1l10 10M11 1L1 11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
        header.classList.add('broadcast-search-header'); header.append(button);
        state.header = header; state.button = button;
      }
      const clear = state.header.querySelector('.clear');
      const size = clear ? getComputedStyle(clear).fontSize : '12px';
      if (state.button.style.getPropertyValue('--broadcast-search-close-size') !== size) {
        state.button.style.setProperty('--broadcast-search-close-size', size);
      }
    }
  }
  function schedule() { if (!stopped && !frame) frame = requestAnimationFrame(update); }
  function reopen(event) {
    const input = event.target.closest?.('input.nav-search-input,input.nav-search-content,input[name="keyword"],input.search-input-el');
    if (!input?.closest(headers)) return;
    for (const [panel, state] of panels) {
      if (state.host.contains(input)) panel.classList.remove('broadcast-search-closed');
    }
  }
  function close(panel, state) {
    panel.classList.add('broadcast-search-closed');
    const active = document.activeElement;
    if (state.host.contains(active)) active.blur();
  }
  // Keep native outside-click handling from removing the button before click.
  document.addEventListener('mousedown', event => {
    if (!event.target.closest?.('.broadcast-search-close')) return;
    event.preventDefault(); event.stopPropagation();
  }, {signal});
  document.addEventListener('click', event => {
    const button = event.target.closest?.('.broadcast-search-close');
    if (!button) return;
    const panel = button.closest(selector), state = panels.get(panel);
    if (!state) return;
    event.preventDefault(); event.stopPropagation();
    close(panel, state);
  }, {signal});
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || event.isComposing || event.keyCode === 229) return;
    for (const [panel, state] of panels) {
      if (!panel.getClientRects().length || getComputedStyle(panel).visibility === 'hidden') continue;
      event.preventDefault();
      close(panel, state);
    }
  }, {capture:true, signal});
  for (const type of ['pointerdown', 'focusin', 'input']) {
    document.addEventListener(type, reopen, {capture:true, signal});
  }
  const mutations = new MutationObserver(records => {
    if (records.some(record => record.target.closest?.(headers) || [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 && (node.matches(headers) || node.querySelector(headers))))) schedule();
  });
  mutations.observe(document.body || document.documentElement, {childList:true, subtree:true});
  update();
  return {update, destroy() {
    stopped = true; mutations.disconnect(); cancelAnimationFrame(frame);
    for (const [panel, state] of panels) restore(panel, state);
    panels.clear(); style.remove();
  }};
}
