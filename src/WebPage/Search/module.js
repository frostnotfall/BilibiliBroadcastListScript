import {pageId, isPageUrl, createPageOpening} from '../../common/index.js';
import {mountHomeLayout} from '../../common/main-site/home-layout.js';
import {homeStyle} from '../../common/main-site/home-style.js';
import searchStyle from './layout.css';

export const early = () => createPageOpening();
export function mount() {
  return mountHomeLayout(homeStyle() + searchStyle, () => pageId(location.href) === 'Search', {
    contentSelector:'.search-layout .video-list,.search-layout .live-room-cards,.feed2 .recommended-container_floor-aside > .container,.head-cards,.loading-cards,.channel-feed,.popular-list .card-list,.fav-list-main .items,.section-cards,#room-card-list,main [class~="grid"],.items-container',
    avatarNavigationEnabled:false, avatarLink:isAvatarNavigationLink,
  });
}

function isAvatarNavigationLink(link) {
  if (!(link instanceof HTMLAnchorElement) || link.hasAttribute('download')) return false;
  const url = new URL(link.href, location.href);
  if (!isPageUrl(url)) return false;
  const destination = url.hostname === 'space.bilibili.com' && /^\/\d+\/?$/.test(url.pathname)
    || url.hostname === 'link.bilibili.com' && url.pathname === '/p/center/index'
      && /^#\/?user-center\/my-info(?:\/|$)/.test(url.hash);
  return Boolean(destination && (link.closest('.header-avatar-wrap')
    && (link.matches('.header-entry-mini,.header-entry-avatar') || link.querySelector('.bili-avatar'))
    || link.closest('.link-navbar') && (link.querySelector('.user-avatar')
      || link.closest('.user-panel-ctnr,.user-panel') && link.textContent.trim() === '主站空间')
    || link.closest('.charity-header') && link.matches('.user') && link.querySelector('.face')));
}
