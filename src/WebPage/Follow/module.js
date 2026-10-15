import {pageId, createPageOpening} from '../../common/index.js';
import {pageStyle} from './style.js';
import {mountLivePage} from '../../common/live/runtime.js';

export const early = () => createPageOpening();
let current = null;
export const routeChanged = () => current?.refresh();

export function mount() {
  if (pageId(location.href) !== 'Follow') return;
  window.bilibiliFollowPageScript?.destroy();
  const html = document.documentElement;
  const narrow = matchMedia('(max-width: 1099px)');
  const hidden = new Set(), shells = new Set();
  const style = document.createElement('style');
  style.id = 'follow-script-style';
  style.textContent = pageStyle;
  (document.head || html).append(style);
  html.classList.add('follow-script-active');
  let frame = 0, stopped = false;
  const header = mountLivePage({id:'Follow', headerOnly:true});

  // Keep the native main subtree in place, including its handlers. Only siblings
  // along its path to body are hidden; waiting for Vue must never blank the page.
  function reconcileClasses(owned, desired, name) {
    for (const element of owned) if (!desired.has(element)) {
      element.classList.remove(name);
      owned.delete(element);
    }
    for (const element of desired) if (!element.classList.contains(name)) {
      element.classList.add(name);
      owned.add(element);
    }
  }
  function refresh() {
    frame = 0;
    if (stopped) return;
    const keep = new Set(), hide = new Set();
    const main = narrow.matches && pageId(location.href) === 'Follow'
      ? document.body.querySelector('.main-ctnr.p-relative.f-right') : null;
    if (main) {
      let branch = main;
      while (branch.parentElement) {
        const parent = branch.parentElement;
        keep.add(parent);
        for (const sibling of parent.children) {
          // Shared overlays live beside the page root. Hiding a modal's shadow
          // host leaves showModal() active and makes the whole page inert.
          if (sibling === branch || ['broadcast-navigation','broadcast-media-menu','broadcast-external-dialog','live-home-more-menu'].includes(sibling.id)) continue;
          if (sibling.matches('.link-navbar') || sibling.querySelector('.link-navbar')) continue;
          hide.add(sibling);
        }
        if (parent === document.body) break;
        branch = parent;
      }
    }
    reconcileClasses(hidden, hide, 'follow-script-hidden');
    reconcileClasses(shells, keep, 'follow-script-shell');
  }
  function schedule() {
    if (!stopped && !frame) frame = requestAnimationFrame(refresh);
  }
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['class']});
  narrow.addEventListener('change', schedule);
  const controller = {
    refresh:schedule,
    destroy() {
      if (stopped) return;
      stopped = true;
      observer.disconnect();
      narrow.removeEventListener('change', schedule);
      cancelAnimationFrame(frame);
      header?.destroy();
      for (const element of hidden) element.classList.remove('follow-script-hidden');
      for (const element of shells) element.classList.remove('follow-script-shell');
      hidden.clear(); shells.clear();
      style.remove(); html.classList.remove('follow-script-active');
      if (current === controller) current = null;
      if (window.bilibiliFollowPageScript === controller) delete window.bilibiliFollowPageScript;
    },
  };
  current = window.bilibiliFollowPageScript = controller;
  refresh();
  return controller;
}
