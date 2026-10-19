import {isPlayitemUrl, urlOf} from '../../common/urls.js';

export const liveUserSelector = '.bili-dyn-live-users__item';
export const liveFaceSelector = '.bili-dyn-live-users__item__face';
export const liveNameSelector = '.bili-dyn-live-users__item__uname';

// Native live rows use click handlers instead of anchors. Read their current
// destination at menu-open time, including when the name or title was clicked.
export function resolveFeedLiveLink(event) {
  const row = event.composedPath().find(node => node.matches?.(liveUserSelector));
  if (!row?.closest('.bili-dyn-live-users')) return null;
  const click = row.$log?.click;
  const url = urlOf(click?.url);
  if (url?.hostname === 'live.bilibili.com' && isPlayitemUrl(url)) return {anchor:row, url:url.href};
  const room = String(click?.value?.room_id || '');
  return /^[1-9]\d*$/.test(room) ? {anchor:row, url:`https://live.bilibili.com/${room}`} : null;
}
