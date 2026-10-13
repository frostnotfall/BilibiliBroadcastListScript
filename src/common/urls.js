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
export function isMediaUrl(value) {
  const url = value instanceof URL ? value : urlOf(value);
  if (!url || !['http:', 'https:'].includes(url.protocol)) return false;
  const path = url.pathname;
  if (url.hostname === 'live.bilibili.com') return /^\/(?:blanc\/)?\d+\/?$/.test(path);
  if (url.hostname !== 'www.bilibili.com') return false;
  // Native Space "play all" opens a numeric /list/<uid> with sort/source params.
  // Keep that exact target alongside the older explicit media forms.
  // No suffix subpaths, host-wide rules or substring matching.
  return /^\/video\/(?:BV[a-z\d]+|av\d+)\/?$/i.test(path)
    || /^\/bangumi\/(?:media\/md|play\/(?:ep|ss))\d+\/?$/i.test(path)
    || /^\/audio\/(?:am|au)\d+\/?$/i.test(path)
    || /^\/medialist\/detail\/ml\d+\/?$/i.test(path)
    || /^\/list\/\d+\/?$/.test(path);
}
export const isShortUrl = value => urlOf(value)?.hostname === 'b23.tv';
export function classifyUrl(value) {
  return isShortUrl(value) ? 'short' : isMediaUrl(value) ? 'media' : isPageUrl(value) ? 'page' : 'native';
}
