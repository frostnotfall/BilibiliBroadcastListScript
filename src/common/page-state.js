// One cheap fallback for bridge replacement and history methods replaced by the
// site. Layout work runs only after an actual state change.
const listeners = new Set();
let events = null, timer = 0, url = '', bridge = null;

export function syncPageState() {
  if (!listeners.size) return;
  const nextUrl = location.href, nextBridge = window.__potPlayerBilibiliClick;
  if (nextUrl === url && nextBridge === bridge) return;
  const change = {routeChanged:nextUrl !== url, bridgeChanged:nextBridge !== bridge};
  url = nextUrl; bridge = nextBridge;
  for (const listener of [...listeners]) if (listeners.has(listener)) listener(change);
}

export function watchPageState(listener, signal) {
  if (signal.aborted) return;
  if (!listeners.size) {
    url = location.href; bridge = window.__potPlayerBilibiliClick;
    events = new AbortController();
    for (const type of ['popstate','hashchange','pageshow']) window.addEventListener(type, syncPageState, {signal:events.signal});
    timer = setInterval(syncPageState, 1000);
  }
  listeners.add(listener);
  signal.addEventListener('abort', () => {
    listeners.delete(listener);
    if (!listeners.size) { clearInterval(timer); timer = 0; events.abort(); events = null; bridge = null; url = ''; }
  }, {once:true});
}
