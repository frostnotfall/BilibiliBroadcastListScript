import {urlOf, classifyUrl, isMediaUrl, isPlayitemUrl, isPlaylistUrl, isPlayerUrl, isPageUrl, isShortUrl, playerCommandUri} from './urls.js';
import {createMediaMenu} from './media-menu.js';
import {version} from './version.js';

const resultType = 'potPlayer.short-link.result';
const resolverName = 'potPlayer.short-link:';

// This is the only behavior enabled in child frames. Native document-created
// injection can run here even though the resolver's sandbox disables site scripts.
export function reportResolverFrame() {
  if (window === window.top) return false;
  if (window.name.startsWith(resolverName)) {
    window.parent.postMessage({type:resultType, token:window.name.slice(resolverName.length), url:location.href}, '*');
  }
  return true;
}

// Called explicitly by the selected page's early hook; importing this module
// never installs events. A single instance owns the page's playback/navigation.
export function createPageOpening({beforeMedia = () => {}, ignoreClick = () => false, timeout = 8000} = {}) {
  const originalOpen = window.open;
  const events = new AbortController();
  const shortLinks = new Map(), ignored = new Set(), observers = new Map();
  const pendingNodes = new Set(), watchedTags = new Set();
  let stopped = false, click = null, timer = 0, frame = 0;
  const normalized = value => urlOf(value)?.href || '';
  function isIgnored(value, probe = false, explicit = false) {
    for (const rule of ignored) {
      try { if (rule(new URL(value), {probe, explicit})) return true; }
      catch (error) { console.warn('[BroadcastListScript] ignoreUrl failed', error); }
    }
    return false;
  }
  function resolveUrl(value) {
    const url = normalized(value);
    if (!url || !isShortUrl(url)) return Promise.resolve(url);
    if (shortLinks.has(url)) return shortLinks.get(url).promise;
    const entry = {url:'', promise:null, cancel() {}};
    shortLinks.set(url, entry);
    entry.promise = new Promise(resolve => {
      if (stopped || !document.documentElement) { shortLinks.delete(url); resolve(''); return; }
      const iframe = document.createElement('iframe');
      const token = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2,'0')).join('');
      iframe.hidden = true;
      iframe.name = resolverName + token;
      iframe.setAttribute('sandbox', 'allow-same-origin');
      iframe.setAttribute('referrerpolicy', 'no-referrer');
      let finished = false;
      function finish(value) {
        if (finished) return;
        const finalUrl = normalized(value);
        if (finalUrl && isShortUrl(finalUrl)) return;
        finished = true;
        clearTimeout(expiry);
        window.removeEventListener('message', onMessage);
        iframe.onload = iframe.onerror = null;
        iframe.remove();
        entry.url = finalUrl;
        if (!finalUrl) shortLinks.delete(url);
        resolve(finalUrl);
      }
      function onMessage(event) {
        if (!event.isTrusted || event.source !== iframe.contentWindow) return;
        const data = event.data;
        if (data?.type !== resultType || data.token !== token) return;
        const target = normalized(data.url);
        if (target && new URL(target).origin === event.origin) finish(target);
      }
      const expiry = setTimeout(() => finish(''), timeout);
      entry.cancel = () => finish('');
      window.addEventListener('message', onMessage);
      iframe.onload = () => {
        try { const target = iframe.contentDocument?.URL; if (target) finish(target); }
        catch { /* Cross-origin result is reported by document-created injection. */ }
      };
      iframe.onerror = () => finish('');
      iframe.src = url;
      (document.body || document.documentElement).append(iframe);
    });
    return entry.promise;
  }
  function send(value, state, {playlist = false, explicit = false} = {}) {
    if (stopped || !(playlist ? isPlayerUrl(value) : isMediaUrl(value))) return false;
    if (state.sent.has(value)) return true;
    if (typeof window.chrome?.webview?.postMessage !== 'function') return false;
    if (isIgnored(value, false, explicit)) return false;
    try {
      beforeMedia(new URL(value));
      // The host contract is type + url only, with no command-line options or
      // capability acknowledgement. New processes use the registered URI
      // protocol instead of adding unsupported options to this message.
      window.chrome.webview.postMessage({type:'potPlayer.video-click', url:value});
      state.sent.add(value);
      return true;
    } catch { return false; }
  }
  function dispatch(value, state) {
    if (stopped) return false;
    if (state.explicit && isPlayerUrl(value)) return send(value, state, {playlist:true, explicit:true});
    if (isPlayitemUrl(value)) return send(value, state);
    if (isPageUrl(value)) {
      if (!state.sent.has(value)) { state.sent.add(value); location.assign(value); }
      return true;
    }
    // Native "play all" buttons open playlist URLs without an anchor. Keep
    // that media intent; an ordinary link to an unadapted page asks to leave.
    if (state.nativeMedia && isMediaUrl(value)) return send(value, state, {playlist:true});
    if (typeof window.chrome?.webview?.postMessage === 'function' && !isIgnored(value, true)) {
      if (state.sent.has(value)) return true;
      if (mediaMenu.confirmExternal(value)) { state.sent.add(value); return true; }
    }
    return false;
  }
  function handle(value, state, fallback) {
    const url = normalized(value);
    if (!url || stopped) return false;
    if (!isShortUrl(url)) return dispatch(url, state);
    const cached = shortLinks.get(url);
    if (cached?.url) return dispatch(cached.url, state);
    if (state.pending.has(url)) return true;
    state.pending.add(url);
    resolveUrl(url).then(realUrl => {
      if (!stopped && (!realUrl || !dispatch(realUrl, state))) fallback();
    });
    return true;
  }
  function clearClick() { clearTimeout(timer); timer = 0; click = null; }
  function linkTarget(event) {
    if (ignoreClick(event)) return null;
    const anchor = event.composedPath().find(node => node.matches?.('a[href]')) || event.target?.closest?.('a[href]');
    if (!anchor || anchor.hasAttribute('download')) return null;
    const url = normalized(anchor.getAttribute('href'));
    if (!url) return null;
    const target = anchor.getAttribute('target') || document.querySelector('base[target]')?.getAttribute('target') || '_self';
    return {anchor, url, fallback:() => target === '_self' ? location.assign(url) : Reflect.apply(originalOpen, window, [url, target])};
  }
  function playerCommand({url, fallback}, command, target, playback = false) {
    clearClick();
    function launch(value) {
      const uri = playerCommandUri(value, command);
      if (!uri || stopped || isIgnored(value, !playback, true)) return false;
      try {
        if (playback) beforeMedia(new URL(value));
        // VOD/live hosts can claim _self media navigation. Player commands use
        // the native new-window path; /current directs playlist edits back to
        // the running player.
        Reflect.apply(originalOpen, window, [uri, target]);
        return true;
      } catch { return false; }
    }
    const cached = shortLinks.get(url)?.url;
    if (isShortUrl(url) && !cached) resolveUrl(url).then(value => {if (!stopped && !launch(value)) fallback();});
    else if (!launch(cached || url)) fallback();
  }
  const mediaMenu = createMediaMenu({
    getTarget(event) {
      if (typeof window.chrome?.webview?.postMessage !== 'function') return null;
      const target = linkTarget(event);
      if (!target || isIgnored(target.url, true, true)) return null;
      const resolved = shortLinks.get(target.url)?.url || target.url;
      if (isIgnored(resolved, true, true)) return null;
      const kind = isPlayitemUrl(resolved) || isShortUrl(resolved) ? 'media' : isPageUrl(resolved) ? 'page' : 'native';
      return {...target, kind, playlist:isPlaylistUrl(resolved)};
    },
    openPage({url, fallback}) {
      clearClick();
      if (!handle(url, {sent:new Set(), pending:new Set()}, fallback)) fallback();
    },
    play({url, fallback}) {
      clearClick();
      if (!handle(url, {sent:new Set(), pending:new Set(), explicit:true}, fallback)) fallback();
    },
    openNew:target => playerCommand(target, 'new', '_blank', true),
    addNext:target => playerCommand(target, 'insert', '_blank'),
    addLast:target => playerCommand(target, 'add', '_blank'),
    openExternal({url}) {
      clearClick();
      // Use the native new-window path, like a normal middle click. Do not run
      // the click-scoped window.open wrapper, which would send media to play.
      Reflect.apply(originalOpen, window, [url, '_blank', 'noopener']);
    },
  });
  function onClick(event) {
    if (stopped || !event.isTrusted || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
    clearClick();
    // A page can preserve an embedded native action before we handle its parent link.
    if (ignoreClick(event)) return;
    const state = {sent:new Set(), pending:new Set()};
    click = state; timer = setTimeout(clearClick, 0);
    const anchor = event.composedPath().find(node => node.matches?.('a[href]')) || event.target?.closest?.('a[href]');
    state.nativeMedia = !anchor;
    if (!anchor || anchor.hasAttribute('download')) { if (anchor) clearClick(); return; }
    const url = normalized(anchor.getAttribute('href'));
    if (!url) return;
    const target = anchor.getAttribute('target') || document.querySelector('base[target]')?.getAttribute('target') || '_self';
    const fallback = () => target === '_self' ? location.assign(url) : Reflect.apply(originalOpen, window, [url, target]);
    if (!handle(url, state, fallback)) return;
    event.preventDefault(); event.stopImmediatePropagation();
  }
  function open(...args) {
    if (!stopped && click && handle(args[0], click, () => Reflect.apply(originalOpen, this, args))) return null;
    return Reflect.apply(originalOpen, this, args);
  }
  function onAuxClick(event) {
    if (stopped || !event.isTrusted || event.button !== 1 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
    if (typeof window.chrome?.webview?.postMessage !== 'function') return;
    const target = linkTarget(event);
    if (!target) return;
    const resolved = shortLinks.get(target.url)?.url || target.url;
    if (!isPageUrl(resolved) || isPlayitemUrl(resolved) || isIgnored(resolved, true, true)) return;
    event.preventDefault(); event.stopImmediatePropagation(); clearClick();
    Reflect.apply(originalOpen, window, [target.url, '_blank', 'noopener']);
  }
  function scan(node) {
    if (stopped || !node.querySelectorAll) return;
    if (node.matches?.('a[href]') && isShortUrl(node.getAttribute('href'))) resolveUrl(node.getAttribute('href'));
    for (const link of node.querySelectorAll('a[href*="b23.tv" i]')) resolveUrl(link.getAttribute('href'));
    for (const element of [node, ...node.querySelectorAll('*')]) {
      if (element.shadowRoot) { observe(element.shadowRoot); scan(element.shadowRoot); }
      if (element.localName?.includes('-') && !watchedTags.has(element.localName) && window.customElements) {
        watchedTags.add(element.localName);
        customElements.whenDefined(element.localName).then(() => { if (!stopped) schedule(document); }, () => {});
      }
    }
  }
  function observe(root) {
    if (observers.has(root)) return;
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes') schedule(record.target);
        else for (const node of record.addedNodes) schedule(node);
      }
      for (const [target, watcher] of observers) if (target.host && !target.host.isConnected) {
        watcher.disconnect(); observers.delete(target);
      }
    });
    observer.observe(root, {childList:true, subtree:true, attributes:true, attributeFilter:['href']});
    observers.set(root, observer);
  }
  function prepare() {
    frame = 0;
    const nodes = [...pendingNodes]; pendingNodes.clear();
    for (const node of nodes) if (node === document || node.isConnected) scan(node);
  }
  function schedule(node = document) {
    if (stopped) return;
    pendingNodes.add(node);
    if (!frame) frame = requestAnimationFrame(prepare);
  }
  const controller = {
    version, classifyUrl, isSupportedUrl:isMediaUrl, resolveUrl,
    ignoreUrl(predicate) {
      if (typeof predicate !== 'function') throw new TypeError('ignoreUrl requires a predicate');
      if (stopped) return () => {};
      // Menu eligibility probes must leave playback side effects for the action.
      const rule = (url, context) => predicate(url, context); ignored.add(rule);
      return () => ignored.delete(rule);
    },
    // Compatibility API sends media only; page navigation is an explicit click action.
    async open(value) { return send(await resolveUrl(value), click || {sent:new Set(), pending:new Set()}); },
    destroy() {
      if (stopped) return;
      stopped = true; events.abort(); mediaMenu.destroy(); clearClick(); cancelAnimationFrame(frame);
      for (const observer of observers.values()) observer.disconnect();
      observers.clear(); pendingNodes.clear(); ignored.clear(); watchedTags.clear();
      for (const entry of shortLinks.values()) entry.cancel();
      shortLinks.clear();
      if (window.open === open) window.open = originalOpen;
      if (window.__potPlayerBilibiliClick === controller) delete window.__potPlayerBilibiliClick;
    },
  };
  window.__potPlayerBilibiliClick = controller;
  window.open = open;
  // Window capture handlers in page modules get to preserve native search first.
  document.addEventListener('click', onClick, {capture:true, passive:false, signal:events.signal});
  document.addEventListener('auxclick', onAuxClick, {capture:true, passive:false, signal:events.signal});
  document.addEventListener('DOMContentLoaded', () => schedule(document), {signal:events.signal});
  observe(document); schedule(document);
  return controller;
}
