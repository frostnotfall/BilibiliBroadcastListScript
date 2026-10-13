import {pageId, createPageOpening} from '../../common/index.js';
import {mountHomeLayout} from '../../common/main-site/home-layout.js';
import {pageStyle} from './style.js';

// Selection controls sit inside the native cover link; let their handlers run.
export const early = () => createPageOpening({
  ignoreClick:event => Boolean(event.target?.closest?.('.bili-card-checkbox,.bili-card-checkbox-overlay')),
});

// Content uses CSS so Vue can replace cards, filters and dialogs without
// moving native nodes or duplicating their handlers. Header behavior is shared.
export function mount() {
  const layout = mountHomeLayout(pageStyle, () => pageId(location.href) === 'Watchlater');
  if (!layout) return;
  let stopped = false;
  document.documentElement.classList.add('watchlaterscript-active');
  return {
    destroy() {
      if (stopped) return;
      stopped = true;
      layout.destroy();
      document.documentElement.classList.remove('watchlaterscript-active');
    },
  };
}
