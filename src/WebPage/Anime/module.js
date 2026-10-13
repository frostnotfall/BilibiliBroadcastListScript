import {pageId, isPageUrl, isMediaUrl, createPageOpening} from '../../common/index.js';
import {mountHomeLayout} from '../../common/main-site/home-layout.js';
import {pageStyle} from './style.js';
import {mountAnimeContent} from './content-layout.js';
export const early = () => createPageOpening();
export const mount = () => {
  const layout = mountHomeLayout(pageStyle, () => pageId(location.href) === 'Anime');
  if (!layout) return;
  const content = mountAnimeContent();
  const instance = {destroy() { content.destroy(); layout.destroy(); }};
  window.bilibiliHomePageScript = instance;
  return instance;
};
