// Native controls stay in place, including Vue's handlers and back-to-top state.
export function mountArticleSidebar() {
  const html = document.documentElement;
  const narrow = matchMedia('(max-width:1099px)');
  const events = new AbortController();
  const roots = new Map(), sized = new Set(), rails = new Set();
  const variables = ['--articlescript-backtop-bottom', '--articlescript-sidebar-top', '--articlescript-sidebar-room'];
  let stopped = false, frame = 0, pointer = null, dragging = false;

  const selected = () => !!document.getSelection()?.toString();
  function containsPoint(element) {
    if (!pointer) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && pointer.x >= rect.left && pointer.x < rect.right
      && pointer.y >= rect.top && pointer.y < rect.bottom;
  }
  function hover() {
    const allowed = narrow.matches && !dragging && !selected();
    for (const rail of rails) {
      const inside = allowed && [...rail.querySelectorAll('.side-toolbar__top,.side-toolbar__box')].some(containsPoint)
        && containsPoint(rail);
      if (rail.classList.contains('articlescript-sidebar-hover') !== inside) rail.classList.toggle('articlescript-sidebar-hover', inside);
    }
  }
  function schedule() {
    if (!stopped && !frame) frame = requestAnimationFrame(sync);
  }
  const resize = new ResizeObserver(schedule);
  function observe(root) {
    if (!root || roots.has(root)) return false;
    const mutations = new MutationObserver(schedule);
    roots.set(root, mutations);
    mutations.observe(root, {childList:true, subtree:true, attributes:true, attributeFilter:['style','class','hidden']});
    return true;
  }
  function watchSize(element) {
    if (!sized.has(element)) { sized.add(element); resize.observe(element); }
  }
  function variable(name, value) {
    if (html.style.getPropertyValue(name) !== value) html.style.setProperty(name, value);
  }
  function discoverComments() {
    let changed = false;
    const current = new Set([document.body]);
    // Comment components can upgrade and attach their shadow roots after mount.
    // Observe both levels: the fixed composer lives inside the header renderer.
    const composers = [...document.querySelectorAll('.bili-comments-bottom-fixed-wrapper')];
    for (const comments of document.querySelectorAll('.opus-detail bili-comments')) {
      const root = comments.shadowRoot;
      if (!root) continue;
      current.add(root);
      for (const header of root.querySelectorAll('bili-comments-header-renderer')) {
        if (header.shadowRoot) current.add(header.shadowRoot);
        composers.push(...header.shadowRoot?.querySelectorAll('.bili-comments-bottom-fixed-wrapper') || []);
      }
    }
    for (const [root, observer] of roots) if (!current.has(root) || !root.isConnected) {
      observer.disconnect(); roots.delete(root); changed = true;
    }
    for (const root of current) if (observe(root)) changed = true;
    return {composers, changed};
  }
  function sync() {
    frame = 0;
    if (stopped) return;
    for (const rail of rails) if (!rail.isConnected) { rail.classList.remove('articlescript-sidebar-hover'); rails.delete(rail); }
    for (const rail of document.querySelectorAll('.opus-detail .right-sidebar-wrap')) { rails.add(rail); watchSize(rail); }
    const {composers} = discoverComments();
    for (const element of sized) if (!element.isConnected) { resize.unobserve(element); sized.delete(element); }
    if (!narrow.matches) {
      for (const name of variables) html.style.removeProperty(name);
      hover(); return;
    }
    const height = document.documentElement.clientHeight;
    let composerTop = height;
    for (const composer of composers) {
      watchSize(composer);
      const rect = composer.getBoundingClientRect(), style = getComputedStyle(composer);
      if (rect.width && rect.height && rect.bottom > 0 && rect.top >= 0 && rect.top < height
        && style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0') composerTop = Math.min(composerTop, rect.top);
    }
    variable('--articlescript-backtop-bottom', `${height - composerTop + 2}px`);
    let headerBottom = 0;
    for (const header of document.querySelectorAll('#broadcast-navigation,.bili-header__bar')) {
      const rect = header.getBoundingClientRect();
      if (rect.height && rect.bottom > 0 && rect.top < height) headerBottom = Math.max(headerBottom, rect.bottom);
    }
    for (const rail of rails) {
      const bottom = rail.querySelector('.side-toolbar__bottom');
      const limit = Math.min(composerTop, bottom?.getBoundingClientRect().top ?? composerTop) - 2;
      const naturalHeight = rail.querySelector('.side-toolbar')?.scrollHeight || rail.scrollHeight;
      const top = Math.max(headerBottom + 2, Math.min(180, limit - naturalHeight));
      variable('--articlescript-sidebar-top', `${top}px`);
      variable('--articlescript-sidebar-room', `${Math.max(0, limit - top)}px`);
    }
    hover();
  }
  const options = {signal:events.signal, capture:true};
  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    if (!event.buttons) dragging = false;
    pointer = {x:event.clientX, y:event.clientY}; hover();
  }, options);
  document.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    // A drag that begins in article text must never turn into a toolbar click.
    dragging = !event.composedPath().some(node => node instanceof Element
      && node.matches('.right-sidebar-wrap.articlescript-sidebar-hover'));
    hover();
  }, options);
  document.addEventListener('pointerup', () => { dragging = false; hover(); }, options);
  document.addEventListener('pointercancel', () => { dragging = false; pointer = null; hover(); }, options);
  document.addEventListener('selectionchange', hover, options);
  document.addEventListener('pointerleave', event => {
    if (event.target === document || event.target === html) { pointer = null; hover(); }
  }, options);
  window.addEventListener('blur', () => { pointer = null; dragging = false; hover(); }, {signal:events.signal});
  document.addEventListener('scroll', schedule, {...options, passive:true});
  window.addEventListener('resize', schedule, {signal:events.signal});
  narrow.addEventListener('change', schedule, {signal:events.signal});
  observe(document.body);
  watchSize(html);
  // attachShadow itself emits no DOM mutation; this discovers late upgrades.
  const upgrades = setInterval(() => { if (discoverComments().changed) schedule(); }, 1000);
  sync();
  return {
    destroy() {
      if (stopped) return;
      stopped = true; events.abort(); clearInterval(upgrades); cancelAnimationFrame(frame);
      for (const observer of roots.values()) observer.disconnect();
      roots.clear(); resize.disconnect(); sized.clear();
      for (const rail of rails) rail.classList.remove('articlescript-sidebar-hover');
      rails.clear();
      for (const name of variables) html.style.removeProperty(name);
    },
  };
}
