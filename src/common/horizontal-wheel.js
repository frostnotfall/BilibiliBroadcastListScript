// Delegate to the actual scroll container so lazy lists and responsive layouts
// work without tracking individual elements or installing extra observers.
export function mountHorizontalWheel() {
  const events = new AbortController();
  document.addEventListener('wheel', event => {
    if (!event.cancelable || event.defaultPrevented || event.ctrlKey || event.metaKey
        || event.altKey || event.shiftKey || !event.deltaY || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    for (const element of event.composedPath()) {
      if (!(element instanceof Element)) continue;
      if (element === document.body || element === document.documentElement) return;
      const horizontal = element.scrollWidth > element.clientWidth + 1;
      const vertical = element.scrollHeight > element.clientHeight + 1;
      if (!horizontal && !vertical) continue;
      const style = getComputedStyle(element);
      // An inner vertical list (or a two-axis pane) keeps its native wheel.
      if (vertical && /^(auto|scroll|overlay)$/.test(style.overflowY)) return;
      if (!horizontal || !/^(auto|scroll|overlay)$/.test(style.overflowX)) continue;
      const unit = event.deltaMode === 1 ? parseFloat(style.lineHeight) || 16
        : event.deltaMode === 2 ? element.clientWidth : 1;
      const direction = style.direction === 'rtl' ? -1 : 1;
      element.scrollBy({left:event.deltaY * unit * direction, behavior:'instant'});
      // Keep the gesture in the strip at either end, matching the folder tabs.
      event.preventDefault();
      return;
    }
  }, {passive:false, signal:events.signal});
  return {destroy() { events.abort(); }};
}
