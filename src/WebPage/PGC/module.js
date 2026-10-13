import {pageId, isPageUrl, isMediaUrl, createPageOpening} from '../../common/index.js';
import {mountHomeLayout} from '../../common/main-site/home-layout.js';
import {pageStyle} from './style.js';
import {mountCardHoverLayout} from '../../common/card-hover-layout.js';
export const early = () => createPageOpening();
export const mount = () => {
  const layout = mountHomeLayout(pageStyle, () => pageId(location.href) === 'PGC');
  if (!layout) return;
  const cards = mountCardHoverLayout({rowSelector:'.module .list-c:has(> .hover-c)',cardSelector:':scope > .hover-c'});
  const instance = {destroy() {cards.destroy();layout.destroy();}};
  window.bilibiliHomePageScript = instance;
  return instance;
};
