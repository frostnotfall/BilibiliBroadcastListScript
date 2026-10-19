import {pageId, createPageOpening} from '../../common/index.js';
import {mountHomeLayout} from '../../common/main-site/home-layout.js';
import {homeStyle} from '../../common/main-site/home-style.js';
import {createDynamicContent, dynamicContentStyle} from '../../common/dynamic-content.js';
import {createEdgePanels} from '../../common/edge-panels.js';
import {createFixedProfiles} from '../../common/fixed-profiles.js';
import {version} from '../../common/version.js';
import {liveFaceSelector, liveNameSelector, resolveFeedLiveLink} from './live-users.js';
import css from './content.css';

export const early = () => createPageOpening({resolveLink:resolveFeedLiveLink});
export function mount() {
  const matchesPage = () => pageId(location.href) === 'Feed';
  if (!matchesPage()) return;
  window.bilibiliFeedScript?.destroy();
  const header = mountHomeLayout(homeStyle(), matchesPage);
  const html = document.documentElement, narrow = matchMedia('(max-width:1099px)');
  const events = new AbortController(), owned = new Map();
  const profileSelector = 'bili-user-profile,.bili-user-profile';
  const popup = `${profileSelector},[role="dialog"],[role="tooltip"],[class*="popover"],[class*="popper"],[class*="image-viewer"],[class*="image-preview"]`;
  const panels = createEdgePanels({prefix:'feedscript', popup, scrollRegions:{
    left:'.bili-dyn-live-users', right:'.sticky,.bili-dyn-search-trendings',
  }});
  let profileAnchor = null;
  const profiles = createFixedProfiles({selector:profileSelector, getBounds:(host, size) => {
    const sidebar = document.querySelector('.feedscript-shell .edge-panel-left.edge-panel-open');
    if (!sidebar) return null;
    // Keep the native-size card against the viewport's right edge, allowing list overlap.
    const anchor = profileAnchor?.isConnected ? profileAnchor.getBoundingClientRect() : null;
    return {align:'right', ...(anchor && {y:anchor.top - size.height})};
  }});
  let main = null, frame = 0, stopped = false, layoutPending = false, restoreViewport = null, wanted = null;
  const dynamic = createDynamicContent({getRoot:() => main, popup, isActive:() => narrow.matches});
  const style = Object.assign(document.createElement('style'), {
    id:'feedscript-style', textContent:css + `@media(max-width:1099px){html.feedscript-active{${dynamicContentStyle('.feedscript-main')}}}`,
  });
  function mark(element, name) {
    if (!element) return;
    if (!element.classList.contains(name)) {
      if (!owned.has(element)) owned.set(element, new Set());
      owned.get(element).add(name); element.classList.add(name);
    }
    if (wanted && owned.get(element)?.has(name)) {
      if (!wanted.has(element)) wanted.set(element, new Set());
      wanted.get(element).add(name);
    }
  }
  function clearClasses() {
    for (const [element, names] of owned) for (const name of names) element.classList.remove(name);
    owned.clear();
  }
  function updateLayout() {
    wanted = new Map();
    const root = document.querySelector('.bili-dyn-home--member');
    main = root?.querySelector('main') || null;
    if (!main) { clear(); return; }
    if (!style.isConnected) (document.head || html).append(style);
    if (!restoreViewport) {
      const viewport = document.querySelector('meta[name="viewport"]') || document.createElement('meta');
      const original = viewport.getAttribute('content'), existed = viewport.isConnected;
      viewport.name = 'viewport'; viewport.content = 'width=device-width, initial-scale=1';
      if (!existed) document.head.append(viewport);
      restoreViewport = () => {
        if (!existed) viewport.remove();
        else if (viewport.content === 'width=device-width, initial-scale=1') {
          if (original === null) viewport.removeAttribute('content'); else viewport.setAttribute('content', original);
        }
      };
    }
    mark(html, 'feedscript-active'); mark(main, 'feedscript-main'); mark(root, 'feedscript-shell');
    const left = root.querySelector('aside.left'), right = root.querySelector('aside.right');
    const nativeHeader = document.querySelector('#bili-header-container:has(.center-search-container):has(.header-avatar-wrap)');
    mark(nativeHeader, 'feedscript-header');
    for (const target of [main, left, right, nativeHeader]) {
      for (let parent = target?.parentElement; parent; parent = parent.parentElement) mark(parent, 'feedscript-path');
    }
    // Fixed elements must use the viewport even inside a transformed native shell.
    for (const target of [left, right, ...document.querySelectorAll(`.bili-dyn-sidebar,${profileSelector}`)]) {
      for (let parent = target?.parentElement; parent; parent = parent.parentElement) mark(parent, 'feedscript-viewport');
    }
    for (const list of main.querySelectorAll('.bili-dyn-up-list__window')) mark(list, 'feedscript-scroll');
    for (const toolbar of document.querySelectorAll('.bili-dyn-sidebar')) {
      mark(toolbar, 'feedscript-tools');
      for (const button of toolbar.querySelectorAll('.bili-dyn-sidebar__btn')) {
        if (button.textContent.replace(/\s/g,'') === '回到旧版') mark(button, 'feedscript-legacy');
      }
    }
    for (const [element, names] of owned) {
      for (const name of names) if (!wanted.get(element)?.has(name)) {element.classList.remove(name); names.delete(name);}
      if (!names.size) owned.delete(element);
    }
    wanted = null;
    panels.sync({left, right}); dynamic.refresh();
  }
  function clear() {
    panels.clear(); profiles.clear(); dynamic.clear(); clearClasses();
    wanted = null;
    html.classList.remove('feedscript-scrolled');
    restoreViewport?.(); restoreViewport = null; style.remove(); main = null;
  }
  function refresh(layout = true) {
    if (stopped || !document.body) return;
    observer.disconnect();
    try {
      if (narrow.matches) {
        if (layout) updateLayout();
        if (main) {
          html.classList.toggle('feedscript-scrolled', window.scrollY > 160);
          profiles.refresh();
        }
      } else clear();
    } finally {
      if (!stopped && narrow.matches) {
        const options = {subtree:true, childList:true, attributes:true, attributeFilter:['style','class','hidden']};
        observer.observe(html, options);
        for (const host of document.querySelectorAll(profileSelector)) if (host.shadowRoot) observer.observe(host.shadowRoot, options);
      }
    }
  }
  function schedule(layout = true) {
    layoutPending ||= layout;
    if (!stopped && !frame) frame = requestAnimationFrame(() => {
      frame = 0; const pending = layoutPending; layoutPending = false; refresh(pending);
    });
  }
  const observer = new MutationObserver(records => schedule(records.some(record => {
    const target = record.target instanceof Element ? record.target : record.target.parentElement;
    if (!target || target.closest(`${popup},.feedscript-header,[data-edge-control]`)) return false;
    return record.type === 'childList' || record.attributeName === 'class' && target !== html && target.contains(main);
  })));
  const resize = new ResizeObserver(() => schedule()); resize.observe(html);
  const onProfileTransition = event => {
    if (event.target instanceof Element && event.target.closest(profileSelector)) schedule(false);
  };
  const onProfileHover = event => {
    const target = event.target instanceof Element ? event.target : null;
    // Keep the native name click and context menu, but do not start its profile
    // hover timer. Leaving the avatar still runs the site's normal hide logic.
    if (target?.closest(liveNameSelector)) { event.stopImmediatePropagation(); return; }
    if (event.type !== 'mouseover') return;
    const anchor = target?.closest(liveFaceSelector) || null;
    // Crossing the gap into the card must retain its anchor. Clear it only
    // when another native profile trigger takes over (for example a feed author).
    if (!anchor && !event.composedPath().some(node => node._profile)) return;
    if (profileAnchor !== anchor) { profileAnchor = anchor; schedule(false); }
  };
  for (const [target, type, handler, capture = false] of [
    [window,'scroll',() => schedule(false),true], [window,'resize',() => schedule()],
    [window,'pageshow',() => schedule()], [document,'load',() => schedule(),true], [narrow,'change',() => schedule()],
    [document,'transitionrun',onProfileTransition,true], [document,'transitionend',onProfileTransition,true],
    [document,'mouseenter',onProfileHover,true], [document,'mouseover',onProfileHover,true],
  ]) target.addEventListener(type, handler, {signal:events.signal, capture, passive:true});
  refresh();
  const instance = {version, refresh, destroy() {
    if (stopped) return;
    stopped = true; events.abort(); observer.disconnect(); resize.disconnect(); cancelAnimationFrame(frame);
    clear(); panels.destroy(); profiles.destroy(); dynamic.destroy(); header?.destroy();
    if (window.bilibiliFeedScript === instance) delete window.bilibiliFeedScript;
  }};
  window.bilibiliFeedScript = instance;
  return instance;
}
