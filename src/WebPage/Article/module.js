import {pageId, createPageOpening} from '../../common/index.js';
import {mountHomeLayout} from '../../common/main-site/home-layout.js';
import {pageStyle} from './style.js';
import {mountArticleSidebar} from './sidebar.js';

export const early = () => createPageOpening();

// Keep native article, comments and toolbar nodes so Vue retains its handlers.
// Scoped CSS also covers images and comments loaded asynchronously.
export function mount() {
  const layout = mountHomeLayout(pageStyle, () => pageId(location.href) === 'Article');
  if (!layout) return;
  const html = document.documentElement;
  html.classList.add('articlescript-active');
  const sidebar = mountArticleSidebar();
  let stopped = false;
  return {
    destroy() {
      if (stopped) return;
      stopped = true;
      sidebar.destroy();
      layout.destroy();
      html.classList.remove('articlescript-active');
    },
  };
}
