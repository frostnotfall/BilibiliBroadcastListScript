// Anchor each native profile host for its visible session, including shadow hosts.
// Contents, actions, show/hide logic and wheel propagation remain native.
export function createFixedProfiles({selector, getBounds = () => null}) {
  const states = new Map();
  const rule = 'position:fixed!important;inset:auto!important;left:var(--fixed-profile-x)!important;top:var(--fixed-profile-y)!important;zoom:var(--fixed-profile-zoom)!important;transform:none!important;translate:none!important;transition-property:opacity!important;z-index:1400!important;';
  function release(host) {
    const state = states.get(host);
    for (const [name, {value, priority}] of state.styles) {
      if (value) host.style.setProperty(name, value, priority); else host.style.removeProperty(name);
    }
    if (state.attribute === null) host.removeAttribute('data-fixed-profile'); else host.setAttribute('data-fixed-profile', state.attribute);
    state.style.remove(); states.delete(host);
  }
  function refresh() {
    const visible = new Set();
    for (const host of document.querySelectorAll(selector)) {
      if (host.parentElement?.closest(selector)) continue;
      const css = getComputedStyle(host), rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height || css.visibility === 'hidden' || css.display === 'none' || host.hidden) continue;
      visible.add(host);
      let state = states.get(host);
      if (!state) {
        const style = document.createElement('style');
        const scope = host.shadowRoot ? ':host' : selector.split(',').map(s => `${s}[data-fixed-profile]`).join(',');
        const attribute = host.getAttribute('data-fixed-profile');
        // Cancel native geometry transitions before capturing their final position/zoom.
        // Otherwise reopening a reused host can preserve an intermediate animation frame.
        style.textContent = `${scope}{transition-property:opacity!important;}`;
        host.setAttribute('data-fixed-profile', ''); (host.shadowRoot || document.head).append(style);
        const settled = host.getBoundingClientRect();
        state = {style, x:settled.left, y:settled.top, zoom:parseFloat(getComputedStyle(host).zoom) || 1, attribute,
          styles:new Map(['--fixed-profile-x','--fixed-profile-y','--fixed-profile-zoom'].map(name => [name, {value:host.style.getPropertyValue(name), priority:host.style.getPropertyPriority(name)}]))};
        states.set(host, state); style.textContent = `${scope}{${rule}}`;
      }
      let ancestorsZoom = 1;
      for (let parent = host.parentElement; parent; parent = parent.parentElement) ancestorsZoom *= parseFloat(getComputedStyle(parent).zoom) || 1;
      const nativeZoom = ancestorsZoom * state.zoom, height = host.offsetHeight, width = host.offsetWidth;
      const viewport = {left:8, top:8, right:document.documentElement.clientWidth - 8, bottom:innerHeight - 8};
      const preferred = getBounds(host, {width:width * nativeZoom, height:height * nativeZoom}) || {};
      const bounds = {
        left:Math.max(viewport.left, Math.min(preferred.left ?? viewport.left, viewport.right - 1)),
        top:Math.max(viewport.top, Math.min(preferred.top ?? viewport.top, viewport.bottom - 1)),
        right:Math.min(viewport.right, preferred.right ?? viewport.right),
        bottom:Math.min(viewport.bottom, preferred.bottom ?? viewport.bottom),
      };
      const scale = Math.min(1, (bounds.right - bounds.left) / Math.max(1, width * nativeZoom), (bounds.bottom - bounds.top) / Math.max(1, height * nativeZoom));
      const unit = nativeZoom * scale;
      const right = bounds.right - width * unit;
      const x = preferred.align === 'right' ? right : Math.max(bounds.left, Math.min(state.x, right));
      const y = Math.max(bounds.top, Math.min(state.y, bounds.bottom - height * unit));
      for (const [name, value] of Object.entries({'--fixed-profile-x':`${x / unit}px`, '--fixed-profile-y':`${y / unit}px`, '--fixed-profile-zoom':String(state.zoom * scale)})) {
        if (host.style.getPropertyValue(name) !== value) host.style.setProperty(name, value, 'important');
      }
    }
    for (const host of states.keys()) if (!visible.has(host)) release(host);
  }
  const clear = () => { for (const host of [...states.keys()]) release(host); };
  return {refresh, clear, destroy:clear};
}
