import scopes from '../page-scopes.json';

export function urlOf(value, base = location.href) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, base);
    return ['http:', 'https:'].includes(url.protocol) ? url : null;
  } catch { return null; }
}

// The same declaration controls dispatch, link navigation and development rules.
export function pageId(value) {
  const url = value instanceof URL ? value : urlOf(value);
  if (!url || !['http:', 'https:'].includes(url.protocol)) return null;
  const path = url.pathname.replace(/\/$/, '') || '/';
  for (const scope of scopes) {
    if (url.hostname !== scope.host) continue;
    if (scope.protocols && !scope.protocols.includes(url.protocol)) continue;
    if (scope.hashPattern && !new RegExp(scope.hashPattern).test(url.hash)) continue;
    if (scope.paths?.includes(path) || scope.pathPattern && new RegExp(scope.pathPattern).test(url.pathname)) return scope.id;
  }
  return null;
}
export const isPageUrl = value => Boolean(pageId(value));
// PlayitemParse support only; playlist-only URLs must not get the video menu.
export function isPlayitemUrl(value) {
  const url = value instanceof URL ? value : urlOf(value);
  if (!url || !['http:', 'https:'].includes(url.protocol)) return false;
  const path = url.pathname;
  if (url.hostname === 'live.bilibili.com') return /^\/(?:blanc\/)?\d+\/?$/.test(path);
  if (url.hostname !== 'www.bilibili.com') return false;
  return /^\/video\/(?:BV[a-z\d]+|av\d+)\/?$/i.test(path)
    || /^\/bangumi\/(?:media\/md|play\/(?:ep|ss))\d+\/?$/i.test(path)
    || /^\/audio\/au\d+\/?$/i.test(path);
}
export function isMediaUrl(value) {
  const url = value instanceof URL ? value : urlOf(value);
  if (!url || !['http:', 'https:'].includes(url.protocol)) return false;
  if (isPlayitemUrl(url)) return true;
  if (url.hostname !== 'www.bilibili.com') return false;
  const path = url.pathname;
  // Native Space "play all" opens a numeric /list/<uid> with sort/source params.
  // Keep that exact target alongside the older explicit media forms.
  // No suffix subpaths, host-wide rules or substring matching.
  return /^\/audio\/am\d+\/?$/i.test(path)
    || /^\/medialist\/detail\/ml\d+\/?$/i.test(path)
    // Native Watchlater cards and "play all" preserve their list/filter params.
    || /^\/list\/watchlater\/?$/.test(path)
    || /^\/list\/\d+\/?$/.test(path);
}
export const isShortUrl = value => urlOf(value)?.hostname === 'b23.tv';
// Playback/playlist support is independent of the pages this script can lay out.
// Mirrors the supplied BilibiliPotPlayer parser branches, excluding gettid().
// Match real hosts and path boundaries rather than substrings in another URL.
export function isPlaylistUrl(value) {
  const url = value instanceof URL ? value : urlOf(value);
  if (!url || !['http:', 'https:'].includes(url.protocol)) return false;
  const path = url.pathname;
  if (['t.bilibili.com','search.bilibili.com','live.bilibili.com'].includes(url.hostname)) return true;
  if (url.hostname === 'space.bilibili.com') return /^\/\d+(?:\/|$)/.test(path);
  if (url.hostname === 'link.bilibili.com') return /\/user-center\/follow(?:\/|$)/.test(path + url.hash);
  if (url.hostname !== 'www.bilibili.com') return false;
  return path === '/'
    || /^\/v\/popular\/(?:all|weekly|history|rank)(?:\/|$)/.test(path)
    || /^\/list\//.test(path)
    || /^\/(?:watchlater|history)(?:\/|$)/.test(path)
    || /^\/medialist\/detail\/ml\d+\/?$/i.test(path)
    || /^\/audio\/am\d+\/?$/i.test(path)
    || /^\/bangumi\/(?:media\/md|play\/(?:ep|ss))\d+\/?$/i.test(path)
    || /^\/video\/(?:BV[a-z\d]+|av\d+)\/?$/i.test(path);
}
export const isPlayerUrl = value => isPlayitemUrl(value) || isPlaylistUrl(value);
// PotPlayer internally splits the URI's trailing CLI switches even when the
// Windows protocol registration passes the whole URI as one quoted argument.
export function playerCommandUri(value, command) {
  const url = urlOf(value);
  return url && isPlayerUrl(url) && ['new', 'insert', 'add'].includes(command)
    // The host requires /current before a playlist edit to apply it to the
    // running player's default playlist instead of launching another player.
    ? 'potplayer://' + url.href + (command === 'new' ? ' /new' : ' /current /' + command) : '';
}
export const newProcessUri = value => playerCommandUri(value, 'new');
export function classifyUrl(value) {
  return isShortUrl(value) ? 'short' : isMediaUrl(value) ? 'media' : isPageUrl(value) ? 'page' : 'native';
}
