import {pageId} from '../index.js';
import {createLiveNavigation} from './navigation.js';
import {createLiveAvatarLayout} from './avatar-layout.js';
import {createLiveControls} from './home-controls.js';
import {createHeaderSearchControls} from '../header-search-controls.js';
import {liveStyle, liveHeaderStyle} from './style.js';
export function mountLivePage({id = 'LiveHome', extraStyle = '', contentSelector = '#app main [class~="grid"]', headerOnly = false} = {}) {
  const matchesPage = () => pageId(location.href) === id;
  window.bilibiliHomePageScript?.destroy();
  if (!matchesPage()) return;

  const html = document.documentElement;
  const narrow = matchMedia('(max-width: 1099px)');
  const events = new AbortController();
  const attributes = new Map(), properties = new Map(), classes = new Map();
  const observed = new Set();
  let frame = 0, stopped = false;

  // Record only changes we own; adopt a later native value before applying another change.
  function rememberAttribute(element, name, value) {
    if (!attributes.has(element)) attributes.set(element, new Map());
    const saved = attributes.get(element);
    const current = element.getAttribute(name), previous = saved.get(name);
    if (!previous || current !== previous.value) saved.set(name, {original:current,value});
    else previous.value = value;
    if (current !== value) element.setAttribute(name, value);
  }
  function restoreAttribute(element, name) {
    const saved = attributes.get(element), state = saved?.get(name);
    if (!state) return;
    if (element.getAttribute(name) === state.value) {
      if (state.original === null) element.removeAttribute(name);
      else element.setAttribute(name, state.original);
    }
    saved.delete(name);
    if (!saved.size) attributes.delete(element);
  }
  function setProperty(element, name, value) {
    if (!properties.has(element)) properties.set(element,new Map());
    const saved = properties.get(element), previous = saved.get(name);
    const current = element.style.getPropertyValue(name), priority = element.style.getPropertyPriority(name);
    if (!previous || current !== previous.value || priority !== previous.priority) {
      saved.set(name,{original:current,originalPriority:priority,value,priority:''});
    } else previous.value = value;
    if (current !== value || priority) element.style.setProperty(name,value);
  }
  function restoreProperty(element, name) {
    const saved = properties.get(element), state = saved?.get(name);
    if (!state) return;
    if (element.style.getPropertyValue(name) === state.value && element.style.getPropertyPriority(name) === state.priority) {
      if (state.original) element.style.setProperty(name,state.original,state.originalPriority);
      else element.style.removeProperty(name);
    }
    saved.delete(name);
    if (!saved.size) properties.delete(element);
  }
  function ownClass(element, name, enabled = true) {
    if (enabled && !element.classList.contains(name)) {
      if (!classes.has(element)) classes.set(element,new Set());
      classes.get(element).add(name); element.classList.add(name);
    } else if (!enabled && classes.get(element)?.delete(name)) {
      element.classList.remove(name);
      if (!classes.get(element).size) classes.delete(element);
    }
  }
  function fit(items, count) {
    items.forEach((element,index) => ownClass(element,'homepagescript-hidden',narrow.matches && index >= count));
  }
  function observe(element) {
    if (!observed.has(element)) { observed.add(element); resize.observe(element); }
  }

  const style = document.createElement('style');
  style.id = 'homepagescript-style';
  style.textContent = (headerOnly ? liveHeaderStyle : liveStyle) + extraStyle;
  (document.head || html).append(style);
  ownClass(html,'homepagescript-active');

  const navigation = createLiveNavigation({id, signal:events.signal, isStopped:() => stopped,
    rememberAttribute, restoreAttribute});
  const avatarLayout = createLiveAvatarLayout({html, narrow, ownClass, setProperty, restoreProperty,
    observe, schedule});
  const controls = createLiveControls({html, narrow, signal:events.signal, schedule, ownClass, fit,
    includeSidebar:!headerOnly});
  const searchControls = createHeaderSearchControls({signal:events.signal});

  function updateLiveHome() {
    frame = 0;
    if (stopped) return;
    if (!matchesPage()) { destroy(); return; }
    navigation.updateLinks();
    controls.update();
    avatarLayout.update();
    for (const element of observed) if (!element.isConnected) {
      resize.unobserve(element); observed.delete(element);
    }
    for (const container of !headerOnly && contentSelector ? document.querySelectorAll(contentSelector) : []) {
      if (narrow.matches) {
        observe(container);
        const count = innerWidth < 400 ? 1 : Math.max(2,Math.floor((container.clientWidth + 12) / 232));
        setProperty(container,'--homepagescript-columns',String(count));
      } else restoreProperty(container,'--homepagescript-columns');
    }
    if (!narrow.matches) for (const element of classes.keys()) ownClass(element,'homepagescript-hidden',false);
    for (const [element,saved] of attributes) if (!element.isConnected) {
      for (const name of [...saved.keys()]) restoreAttribute(element,name);
    }
    for (const [element,saved] of properties) if (!element.isConnected) {
      for (const name of [...saved.keys()]) restoreProperty(element,name);
    }
    for (const [element,names] of classes) if (!element.isConnected) {
      for (const name of [...names]) ownClass(element,name,false);
    }
  }
  function schedule() { if (!stopped && !frame) frame = requestAnimationFrame(updateLiveHome); }
  const resize = new ResizeObserver(schedule);
  avatarLayout.startObserving();
  const mutations = new MutationObserver(records => {
    let layoutChanged = false;
    for (const record of records) {
      if (controls.contains(record.target)) continue;
      if (record.type === 'attributes') {
        if (record.target instanceof HTMLAnchorElement) navigation.queueLinks(record.target);
      } else {
        layoutChanged = true;
        for (const node of record.addedNodes) if (node instanceof Element) navigation.queueLinks(node);
      }
    }
    if (layoutChanged || navigation.hasPendingLinks()) schedule();
  });
  resize.observe(html);
  mutations.observe(document.body || html,{childList:true,subtree:true,attributes:true,attributeFilter:['href','target','download']});
  window.addEventListener('resize',schedule,{signal:events.signal});
  narrow.addEventListener('change',schedule,{signal:events.signal});
  window.addEventListener('popstate',schedule,{signal:events.signal});
  window.addEventListener('hashchange',schedule,{signal:events.signal});
  // A shared poll detects pushState and bridge reinjection without patching website history.
  const syncTimer = setInterval(() => {
    if (!matchesPage()) destroy();
    else navigation.sync();
  },500);

  function destroy() {
    if (stopped) return;
    stopped = true;
    events.abort(); mutations.disconnect(); avatarLayout.disconnect(); resize.disconnect();
    clearInterval(syncTimer); cancelAnimationFrame(frame);
    navigation.destroy();
    controls.destroy();
    searchControls.destroy();
    avatarLayout.destroy();
    for (const [element,saved] of attributes) for (const name of [...saved.keys()]) restoreAttribute(element,name);
    for (const [element,saved] of properties) for (const name of [...saved.keys()]) restoreProperty(element,name);
    for (const [element,names] of classes) for (const name of names) element.classList.remove(name);
    attributes.clear(); properties.clear(); classes.clear(); observed.clear();
    style.remove();
    if (window.bilibiliHomePageScript === instance) delete window.bilibiliHomePageScript;
  }
  const instance = {destroy};
  window.bilibiliHomePageScript = instance;
  navigation.sync();
  updateLiveHome();
  return instance;
}

export const mount = () => mountLivePage();
