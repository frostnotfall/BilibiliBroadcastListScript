import {pageId, createPageOpening} from '../../common/index.js';
import {mountHomeLayout} from '../../common/main-site/home-layout.js';
import {pageStyle} from './style.js';

export const early = () => createPageOpening();
export function mount() {
  return mountHomeLayout(pageStyle(), () => pageId(location.href) === 'Popular', {
    contentSelector:".feed2 .recommended-container_floor-aside > .container,.head-cards,.loading-cards,.channel-feed,.popular-container .card-list,.weekly-list .video-list,.popular-container .rank-list,.fav-list-main .items,.section-cards,#room-card-list,main [class~=\"grid\"],.items-container",
  });
}
