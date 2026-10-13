import {pageId} from './urls.js';
import {reportResolverFrame} from './opening.js';
import {mountNavigationBar} from './navigation-bar.js';

export function startDispatcher(modules) {
  if (reportResolverFrame()) return;
  window.__bilibiliBroadcast?.destroy();
  if (window.__potPlayerBilibiliClick === true) {
    console.warn('[BroadcastListScript] Refresh to remove the legacy installation before upgrading.');
    return;
  }
  window.__potPlayerBilibiliClick?.destroy?.();
  const events = new AbortController();
  let active = null, navigation = null, stopped = false, lastUrl = '';
  function unmount() {
    if (!active) return;
    const old = active; active = null;
    // UI wrappers were installed above the early opening wrapper: unwind in reverse.
    try { old.ui?.destroy(); } finally { old.opening?.destroy(); }
  }
  function reconcile() {
    if (stopped) return;
    const id = pageId(location.href), module = modules[id];
    if (active?.id !== id || !module) {
      unmount();
      if (module) active = {id, module, opening:module.early(), ui:null};
    }
    if (active && !active.ui && document.readyState !== 'loading' && document.head && document.body) {
      active.ui = active.module.mount();
    }
    if (active && active.ui) {
      navigation ||= mountNavigationBar();
      navigation.sync();
    } else if (!active && navigation) { navigation.destroy(); navigation = null; }
    if (active && lastUrl !== location.href) {
      active.module.routeChanged?.(); navigation?.routeChanged();
    }
    lastUrl = location.href;
  }
  // Observe push/replaceState immediately, including transitions from an unsupported
  // route. The low-frequency fallback also covers a later native history replacement.
  const originals = new Map();
  for (const name of ['pushState', 'replaceState']) {
    const original = history[name];
    function wrapped(...args) {
      const result = Reflect.apply(original, this, args);
      reconcile(); return result;
    }
    originals.set(name, {original, wrapped}); history[name] = wrapped;
  }
  for (const type of ['popstate', 'hashchange', 'pageshow']) window.addEventListener(type, reconcile, {signal:events.signal});
  document.addEventListener('DOMContentLoaded', reconcile, {signal:events.signal});
  const poll = setInterval(reconcile, 250);
  const controller = {
    version:'2.0.0', get activePage() { return active?.id || null; }, reconcile,
    destroy() {
      if (stopped) return;
      stopped = true; events.abort(); clearInterval(poll); unmount(); navigation?.destroy(); navigation = null;
      for (const [name, {original, wrapped}] of originals) if (history[name] === wrapped) history[name] = original;
      if (window.__bilibiliBroadcast === controller) delete window.__bilibiliBroadcast;
    },
  };
  window.addEventListener('pagehide', event => { if (!event.persisted) controller.destroy(); }, {signal:events.signal});
  window.__bilibiliBroadcast = controller;
  reconcile();
  return controller;
}
