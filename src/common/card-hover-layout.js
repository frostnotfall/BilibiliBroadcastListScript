// Responsive geometry only: native hover classes, preview nodes and handlers stay owned by the page.
export function mountCardHoverLayout({rowSelector, cardSelector}) {
  const narrow = matchMedia('(max-width:1099px)');
  const events = new AbortController(), rows = new Set(), properties = new Map();
  let frame = 0, stopped = false;
  function property(element, name, value) {
    let saved = properties.get(element);
    if (!saved) properties.set(element, saved = new Map());
    if (!saved.has(name)) saved.set(name, {value:element.style.getPropertyValue(name), priority:element.style.getPropertyPriority(name)});
    if (element.style.getPropertyValue(name) !== value) element.style.setProperty(name, value);
  }
  function restore(element) {
    for (const [name, original] of properties.get(element) || []) {
      if (original.value) element.style.setProperty(name, original.value, original.priority);
      else element.style.removeProperty(name);
    }
    properties.delete(element);
  }
  function update() {
    frame = 0;if (stopped) return;
    for (const row of rows) if (!row.isConnected) {resize.unobserve(row);rows.delete(row);}
    for (const element of properties.keys()) if (!element.isConnected || !narrow.matches) restore(element);
    for (const row of document.querySelectorAll(rowSelector)) {
      if (!rows.has(row)) {rows.add(row);resize.observe(row);}
      if (!narrow.matches) continue;
      const rowStyle = getComputedStyle(row), paddingLeft = parseFloat(rowStyle.paddingLeft) || 0;
      const width = row.clientWidth - paddingLeft - (parseFloat(rowStyle.paddingRight) || 0);
      if (!width) continue;
      const columns = width < 280 ? 1 : Math.max(2, Math.floor((width + 12) / 170));
      const cell = (width - (columns - 1) * 12) / columns;
      const expanded = Math.min(width, cell * 2 + 12);
      property(row,'--pgc-card-columns',String(columns));
      property(row,'--pgc-card-height',`${cell * 4 / 3}px`);
      property(row,'--pgc-hover-width',`${expanded}px`);
      for (const card of row.querySelectorAll(cardSelector)) {
        // Locate the original grid cell even while native code updates relative left.
        const cellLeft = card.getBoundingClientRect().left - row.getBoundingClientRect().left - paddingLeft - (parseFloat(getComputedStyle(card).left) || 0);
        property(card,'--pgc-hover-offset',`${Math.min(0, width - expanded - cellLeft)}px`);
      }
    }
  }
  function schedule() {if (!stopped && !frame) frame = requestAnimationFrame(update);}
  const resize = new ResizeObserver(schedule);resize.observe(document.documentElement);
  const mutations = new MutationObserver(records => {
    if (records.some(r=>r.type === 'childList' || r.target.matches?.('.hot-ranking-cell-wrapper,.timeline-weekday-item,.hover-c'))) schedule();
  });
  mutations.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
  narrow.addEventListener('change',schedule,{signal:events.signal});
  window.addEventListener('resize',schedule,{signal:events.signal});
  update();
  return {destroy() {
    stopped = true;events.abort();mutations.disconnect();resize.disconnect();cancelAnimationFrame(frame);
    for (const element of properties.keys()) restore(element);
    rows.clear();
  }};
}
