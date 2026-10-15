import {mountNativeSingleRows} from '../../common/native-single-row.js';

// Vue contracts belong to this page. The shared layout never knows about Vue.
function categoryAdapter(vm, schedule) {
  if (!vm?._props || !Number.isFinite(vm.pageCategory) || !Number.isFinite(vm.pageSize)
      || !Array.isArray(vm.itemsAll) || typeof vm.$watch !== 'function') return null;
  const original = vm.pageCategory;
  const unwatch = ['pageCategory','screenCategory','SCREEN_CATEGORY'].map(name=>vm.$watch(name,schedule));
  return {
    resize(columns) {
      if (vm.pageSize === columns) return;
      const first = vm.curPage * vm.pageSize;
      const adjustment = vm.pageCategory - vm.pageSize;
      vm._props.pageCategory = columns + adjustment;
      vm.curPage = Math.min(Math.max(0,Math.ceil(vm.itemsAll.length / columns)-1),Math.floor(first / columns));
    },
    destroy() {
      unwatch.forEach(stop=>stop());
      if (vm._isDestroyed) return;
      const first = vm.curPage * vm.pageSize;
      vm._props.pageCategory = original;
      vm.curPage = Math.min(Math.max(0,Math.ceil(vm.itemsAll.length / vm.pageSize)-1),Math.floor(first / vm.pageSize));
    },
  };
}

function timelineAdapter(vm, schedule) {
  if (!vm?._computedWatchers?.pageSize || !Number.isFinite(vm.pageSize)
      || !Array.isArray(vm.weekdayItems) || typeof vm.setPage !== 'function') return null;
  // Unlike other rows, timeline exposes no page-size prop. Give its existing
  // computed watcher a responsive getter and let the native watchers/setPage
  // keep date changes, page data, arrows and background colours in sync.
  const watcher = vm._computedWatchers.pageSize, original = watcher.getter;
  let columns = vm.pageSize;
  watcher.getter = function() {original.call(this, this);return columns;};
  const unwatch = vm.$watch('SCREEN_CATEGORY',schedule);
  function refresh() {
    watcher.dirty = true;
    if (vm._computedWatchers.pageSum) vm._computedWatchers.pageSum.dirty = true;
    vm.setPage();vm.$forceUpdate();
  }
  return {
    resize(size) {
      if (columns === size) return;
      const first = vm.curPage * vm.pageSize;columns = size;watcher.dirty = true;
      vm.curPage = Math.min(Math.max(0,Math.ceil(vm.weekdayItems.length / size)-1),Math.floor(first / size));
      refresh();
    },
    destroy() {
      unwatch();
      if (vm._isDestroyed) return;
      const first = vm.curPage * vm.pageSize;
      watcher.getter = original;watcher.dirty = true;
      vm.curPage = Math.min(Math.max(0,Math.ceil(vm.weekdayItems.length / vm.pageSize)-1),Math.floor(first / vm.pageSize));
      refresh();
    },
  };
}

export function mountAnimePagination() {
  return mountNativeSingleRows({
    selector:'.home-page-switch-wrapper .inner-content-body,.time-line-body .timeline-common-content-list-container:not(.is-empty)',
    describe(row, schedule) {
      // Wait for asynchronous cards so horizontal rows use the correct ratio.
      if (!row.querySelector(':scope > :is(.hot-ranking-cell-wrapper,.horizontal-cell-wrapper,.timeline-weekday-item)')) return null;
      const timeline = row.matches('.timeline-common-content-list-container');
      const owner = row.closest(timeline ? '.time-line-wrapper' : '.home-page-switch-wrapper');
      const vm = owner?.__vue__;
      const adapter = timeline ? timelineAdapter(vm,schedule) : categoryAdapter(vm,schedule);
      if (!adapter) return null;
      const horizontal = row.firstElementChild?.matches('.horizontal-cell-wrapper');
      return {adapter,container:row.parentElement,valid:()=>owner.isConnected && owner.__vue__ === vm,
        minWidth:horizontal ? 156 : 160,gap:timeline ? 0 : 20,coverRatio:horizontal ? 9/16 : 4/3,
        cardSelector:'.hot-ranking-cell-wrapper,.horizontal-cell-wrapper,.timeline-weekday-item',
        activeSelector:'.is-hover-active-play,.is-hover-active'};
    },
  });
}
