// Adjust the site's page-size input. Its cardlist, arrow handlers and hover
// animation continue to render and operate the ranking without replacement UI.
const rowSelector = '.home-page-switch-wrapper .inner-content-body:has(> .hot-ranking-cell-wrapper .ranking-cell-index)';
export function mountRankingLayout() {
  const narrow = matchMedia('(max-width:1099px)'), events = new AbortController();
  const states = new Map(), attributes = new Map(), properties = new Map();
  let frame = 0, stopped = false;
  function attribute(element,name) {
    if (!attributes.has(element)) attributes.set(element,element.getAttribute(name));
    if (!element.hasAttribute(name)) element.setAttribute(name,'');
  }
  function property(element,name,value) {
    let saved = properties.get(element);
    if (!saved) properties.set(element,saved = new Map());
    if (!saved.has(name)) saved.set(name,{value:element.style.getPropertyValue(name),priority:element.style.getPropertyPriority(name)});
    if (element.style.getPropertyValue(name) !== value) element.style.setProperty(name,value);
  }
  function restoreSize(state) {
    if (!state.owned) return;
    const first = state.vm.curPage * state.vm.pageSize;
    state.vm._props.pageCategory = state.originalCategory;
    state.vm.curPage = Math.floor(first / state.vm.pageSize);
    state.owned = false;
  }
  function update() {
    frame = 0;if (stopped) return;
    for (const [row,state] of states) if (!row.isConnected) {
      state.unwatch.forEach(stop=>stop());
      if (!state.vm._isDestroyed) restoreSize(state);
      resize.unobserve(row);states.delete(row);
    }
    for (const row of new Set([...states.keys(),...document.querySelectorAll(rowSelector)])) {
      const wrapper = row.closest('.home-page-switch-wrapper'), vm = wrapper?.__vue__;
      // Fail back to the site's own layout if its component contract changes.
      if (!vm?._props || !Number.isFinite(vm.pageSize) || !Array.isArray(vm.itemsAll) || vm.modudata?.style !== 'web_rank_v3') continue;
      let state = states.get(row);
      if (!state) {
        state = {vm,originalCategory:vm.pageCategory,owned:false,unwatch:[]};
        states.set(row,state);resize.observe(row);
        state.unwatch = ['pageCategory','SCREEN_CATEGORY'].map(name=>vm.$watch(name,schedule));
      }
      attribute(row,'data-anime-ranking-row');
      for (const card of row.querySelectorAll(':scope > .hot-ranking-cell-wrapper')) attribute(card,'data-anime-native-ranking-card');
      if (!narrow.matches) {restoreSize(state);continue;}
      const wrapperStyle = getComputedStyle(wrapper);
      const width = row.clientWidth || wrapper.clientWidth - (parseFloat(wrapperStyle.paddingLeft) || 0) - (parseFloat(wrapperStyle.paddingRight) || 0);
      if (!width) continue;
      const columns = Math.max(1,Math.floor((width + 20) / 300));
      // Every supported narrow viewport belongs to the site's <=1400 branch.
      // Its store can still hold the previous wide category during resize.
      const category = columns + 1;
      property(row,'--anime-ranking-card-width',`${(width - (columns - 1) * 20) / columns}px`);
      if (vm.pageCategory !== category) {
        const first = vm.curPage * vm.pageSize;
        vm._props.pageCategory = category;
        vm.curPage = Math.floor(first / columns);
      }
      state.owned = true;
    }
  }
  function schedule() {if (!stopped && !frame) frame = requestAnimationFrame(update);}
  const resize = new ResizeObserver(schedule);resize.observe(document.documentElement);
  const mutations = new MutationObserver(schedule);
  mutations.observe(document.body,{childList:true,subtree:true});
  narrow.addEventListener('change',schedule,{signal:events.signal});
  window.addEventListener('resize',schedule,{signal:events.signal});
  update();
  return {destroy() {
    stopped = true;events.abort();mutations.disconnect();resize.disconnect();cancelAnimationFrame(frame);
    for (const state of states.values()) {state.unwatch.forEach(stop=>stop());restoreSize(state);}
    for (const [element,value] of attributes) {
      const name = element.matches('.hot-ranking-cell-wrapper') ? 'data-anime-native-ranking-card' : 'data-anime-ranking-row';
      if (value === null) element.removeAttribute(name);else element.setAttribute(name,value);
    }
    for (const [element,saved] of properties) for (const [name,original] of saved) {
      if (original.value) element.style.setProperty(name,original.value,original.priority);else element.style.removeProperty(name);
    }
    states.clear();attributes.clear();properties.clear();
  }};
}
