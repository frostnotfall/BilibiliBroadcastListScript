import {pageId, isPageUrl, urlOf} from '../urls.js';

export function createLiveNavigation({id, signal, isStopped, rememberAttribute, restoreAttribute}) {
  // Navigation remains active at every width. Avatar/space entries have no special handler.
  const pendingLinks = new Set([document]);
  const navigationScope = `.live-home-new-header,#live-home-more-menu,.bili-header,.bili-header__bar,#homepagescript-menu,.header-channel,.channel-entry-popover,.bili-header-channel-panel,.link-navbar,.charity-header`;
  const searchHeaders = '.bili-header__bar,.mini-header,.international-header,.bili-header-m,.bili-mini-header,.b-header,.link-navbar,.charity-header,.search-fixed-header';
  const searchComponents = '#nav-searchform,#nav_searchform,.center-search-container,.nav-search,.nav-search-box,.search-block,.search-bar-ctnr,.search-box,.search-container,.search-panel,.nav-search-panel,.search-input-wrap,.charity-header .search-input';

  const originalOpen = window.open;
  let potPlayerApi = null, restorePotPlayerIgnore = () => {}, pendingSearch = null;
  let pendingFollow = null, followTimer = 0;


  function isLiveDestination(url) {
    return url?.hostname === 'live.bilibili.com'
      && ['/all','/p/eden/area-tags'].includes(url.pathname.replace(/\/$/,''));
  }
  const isCompletedNavigation = isPageUrl;
  const isFollowDestination = url => pageId(url) === 'Follow';
  function isCurrentTabLink(link) {
    if (!(link instanceof HTMLAnchorElement) || link.hasAttribute('download')) return false;
    const url = urlOf(link.href);
    if (!url) return false;
    if (isFollowDestination(url)) return true;
    if (url.hostname === 'live.bilibili.com') return isLiveDestination(url)
      || pageId(url) === 'LiveHome' && Boolean(link.closest(navigationScope));
    return Boolean(isPageUrl(url) && (link.closest('.bili-header-channel-panel') || link.closest(navigationScope)));
  }
  function searchControl(node) {
    if (node instanceof Element && node.closest('.broadcast-search-close')) return null;
    const component = node instanceof Element ? node.closest(searchComponents) : null;
    return component?.closest(searchHeaders) ? component : null;
  }
  function pauseHomePreview() {
    if (isStopped() || (location.pathname.replace(/\/$/,'') || '/') !== '/') return;
    for (const video of document.querySelectorAll('.player-ctnr video,.main-player video')) {
      if (video.paused || video.ended) continue;
      try { video.pause(); } catch { /* A failed preview pause must not block the room handoff. */ }
    }
  }
  function isNavigationIgnored(url, {probe = false, explicit = false} = {}) {
    // Preserve native asynchronous searches and suggestion links, including native default URLs.
    if (pendingSearch?.component.isConnected) return true;
    if (url.hostname === 'live.bilibili.com') {
      if (isLiveDestination(url)) return !explicit;
      // ignoreUrl is checked synchronously before the bridge posts a playback message.
      // Pause the native preview here, then return false so room playback stays with the bridge.
      if (!probe && /^\/(?:blanc\/)?\d+\/?$/.test(url.pathname)) pauseHomePreview();
      return false;
    }
    return !explicit && isCompletedNavigation(url);
  }
  function syncPotPlayerIgnore() {
    const api = window.__potPlayerBilibiliClick;
    if (api === potPlayerApi) return;
    restorePotPlayerIgnore(); potPlayerApi = api;
    restorePotPlayerIgnore = typeof api?.ignoreUrl === 'function' ? api.ignoreUrl(isNavigationIgnored) : () => {};
  }
  function updateNavigationLinks() {
    for (const root of pendingLinks) {
      const links = root instanceof HTMLAnchorElement ? [root] : Array.from(root.querySelectorAll('a[href]'));
      for (const link of links) {
        if (isCurrentTabLink(link)) rememberAttribute(link,'target','_self');
        else restoreAttribute(link,'target');
      }
    }
    pendingLinks.clear();
  }
  function prepareSearch(event) {
    syncPotPlayerIgnore(); pendingSearch = null;
    if (!event.isTrusted || event.isComposing || event.keyCode === 229) return;
    const component = searchControl(event.target);
    if (!component || event.type === 'pointerdown' && event.button !== 0) return;
    if (anchorOf(event)?.hasAttribute('download')) return;
    if (event.type === 'keydown' && event.key !== 'Enter' && !(event.key === ' ' && event.target.matches('button,[role="button"]'))) return;
    if (['pointerdown','click'].includes(event.type) && event.target.matches('input,textarea')) return;
    pendingSearch = {component,modified:event.ctrlKey || event.metaKey || event.shiftKey || event.altKey};
  }
  function clearFollow() {
    clearTimeout(followTimer); followTimer = 0; pendingFollow = null;
  }
  function followControl(event) {
    const link = anchorOf(event);
    if (link?.hasAttribute('download')) return null;
    if (link && isFollowDestination(urlOf(link.href))) return link;
    // The new homepage can render "查看更多" as a div/span with a native handler.
    // Identify that control within its "我的关注" heading row, without relying on
    // hashed classes or treating other sections' "查看更多" as follow controls.
    if (id !== 'LiveHome') return null;
    for (const node of event.composedPath()) {
      if (!(node instanceof Element)) continue;
      if (!/^查看(?:全部|更多)[>›»＞〉》]*$/.test(node.textContent.replace(/\s/g,''))) continue;
      let branch = node;
      for (let depth = 0; depth < 4 && branch.parentElement; depth++) {
        const parent = branch.parentElement;
        if (parent.matches('main,body')) break;
        if (Array.from(parent.children).some(child => child !== branch && /^我的关注/.test(child.textContent.trim()))) return branch;
        branch = parent;
      }
    }
    return null;
  }
  function prepareFollow(event) {
    clearFollow();
    if (!event.isTrusted || event.isComposing || event.keyCode === 229) return;
    if (event.type === 'keydown' && !['Enter',' '].includes(event.key)) return;
    const control = followControl(event);
    if (!control) return;
    pendingFollow = {control, modified:event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey, sent:new Set()};
    // Retain only this trusted control action across a short native async handler.
    // Unrelated/scripted opens and other destinations keep their native behavior.
    followTimer = setTimeout(clearFollow, 1000);
  }
  function open(...args) {
    const url = urlOf(args[0]), action = pendingSearch;
    if (!isStopped() && isLiveDestination(url)) { pendingSearch = null; location.assign(url.href); return null; }
    if (!isStopped() && action?.component.isConnected && url) {
      if (!action.modified) { pendingSearch = null; location.assign(url.href); return null; }
      try { return Reflect.apply(originalOpen,this,args); }
      finally { pendingSearch = null; }
    }
    if (!isStopped() && pendingFollow?.control.isConnected && isFollowDestination(url)) {
      if (!pendingFollow.modified) {
        if (!pendingFollow.sent.has(url.href)) { pendingFollow.sent.add(url.href); location.assign(url.href); }
        return null;
      }
    }
    return Reflect.apply(originalOpen,this,args);
  }
  function anchorOf(event) {
    return event.composedPath().find(node => node instanceof HTMLAnchorElement && node.hasAttribute('href'))
      || (event.target instanceof Element ? event.target.closest('a[href]') : null);
  }
  function onSearchClick(event) {
    prepareSearch(event);
    if (event.button !== 0 || !pendingSearch || pendingSearch.modified) return;
    const link = anchorOf(event), url = link && !link.hasAttribute('download') ? urlOf(link.href) : null;
    if (url) {
      pendingSearch = null; event.preventDefault(); event.stopImmediatePropagation(); location.assign(url.href);
    }
    // Buttons and suggestions without href continue through their native (possibly async) handlers.
  }
  window.open = open;
  for (const type of ['pointerdown','keydown']) window.addEventListener(type,prepareSearch,{capture:true,signal});
  for (const type of ['pointerdown','keydown','click']) window.addEventListener(type,prepareFollow,{capture:true,signal});
  window.addEventListener('click',onSearchClick,{capture:true,signal});
  window.addEventListener('submit',event => {
    prepareSearch(event);
    if (!pendingSearch) return;
    rememberAttribute(event.target,'target','_self');
    if (event.submitter?.hasAttribute('formtarget')) rememberAttribute(event.submitter,'formtarget','_self');
  },{capture:true,signal});
  window.addEventListener('focusin',event => { if (!searchControl(event.target)) pendingSearch = null; },{capture:true,signal});
  document.addEventListener('click',event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = anchorOf(event);
    if (link && isFollowDestination(urlOf(link.href)) && !event.isTrusted) return;
    if (!isCurrentTabLink(link)) return;
    event.preventDefault(); event.stopImmediatePropagation(); location.assign(link.href);
  },{capture:true,signal});
  function destroyNavigation() {
    pendingLinks.clear();
    clearFollow(); pendingSearch = null; restorePotPlayerIgnore();
    if (window.open === open) window.open = originalOpen;
  }
  return {updateLinks:updateNavigationLinks, sync:syncPotPlayerIgnore, destroy:destroyNavigation,
    queueLinks:node => pendingLinks.add(node), hasPendingLinks:() => pendingLinks.size > 0};
}
