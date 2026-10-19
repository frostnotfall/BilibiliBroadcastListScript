import {pageId, createPageOpening} from '../../common/index.js';
import {mountHomeLayout} from '../../common/main-site/home-layout.js';
import {homeStyle} from '../../common/main-site/home-style.js';
import {createDynamicContent, dynamicContentStyle} from '../../common/dynamic-content.js';
import {createFavoritesLayout} from './favorites.js';
import contentStyle from './content.css';
import favoritesStyle from './favorites.css';

export const early = () => createPageOpening();
export function mount() {
  const css = homeStyle() + contentStyle + favoritesStyle
    + `@media(max-width:1099px) { ${dynamicContentStyle('html.homepagescript-active .space-dynamic')} }`;
  return mountHomeLayout(css, () => pageId(location.href) === 'Space', {
    contentSelector:".feed2 .recommended-container_floor-aside > .container,.head-cards,.loading-cards,.channel-feed,.popular-list .card-list,.fav-list-main .items,.space-home .items,.space-home .article-list,.space-home .video-list__content,.space-upload .opus-collection-list,.space-upload .opus .masonry_grid_v2 > .container,.space-upload .video-list.grid-mode,.space-list-details .list-content,.space-lists .video-list__content,.space-lists .lists-content > .grid-mode,.space-lists .contet-grid > .video-grid,.section-cards,#room-card-list,main [class~=\"grid\"],.items-container",
    columns:container => container.matches('.space-favlist[data-broadcast-favorites-active] .fav-list-main .items')
      ? Math.max(1, Math.floor((container.clientWidth + 12) / 220))
      : innerWidth < 400 ? 1 : Math.max(2, Math.floor((container.clientWidth + 12) / 232)),
    observeLoad:true,
    mountContent({narrow}) {
      const favorites = createFavoritesLayout();
      const dynamic = createDynamicContent({getRoot:() => document.querySelector('.space-dynamic'),isActive:() => narrow.matches});
      return {
        refresh(active) {
          favorites.refresh(active && /^\/\d+\/(?:favlist|fav(?:\/video)?)\/?$/.test(location.pathname));
          if (active) dynamic.refresh(); else dynamic.clear();
        },
        destroy() {favorites.destroy();dynamic.destroy();},
      };
    },
  });
}
