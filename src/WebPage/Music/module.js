import {pageId, createPageOpening} from '../../common/index.js';
import {mountHomeLayout} from '../../common/main-site/home-layout.js';
import {homeStyle} from '../../common/main-site/home-style.js';
import contentCss from './content.css';
import {mountMusicPagination} from './pagination.js';

// /h5/rank is a declared page URL as well. Shared navigation opens its native
// redirect in this tab, retaining query parameters and modified-click behavior.
export const early = () => createPageOpening();

// Keep native Vue nodes and handlers: CSS also applies to asynchronous cards
// and transitions between the three music routes within the same module.
export function mount() {
  const layout = mountHomeLayout(homeStyle() + contentCss, () => pageId(location.href) === 'Music');
  if (!layout) return;
  const html = document.documentElement;
  html.classList.add('musicscript-active');
  const pagination = mountMusicPagination();
  let stopped = false;
  return {
    destroy() {
      if (stopped) return;
      stopped = true;
      pagination.destroy();
      layout.destroy();
      html.classList.remove('musicscript-active');
    },
  };
}
