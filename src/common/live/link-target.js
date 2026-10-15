import {pageId, urlOf} from '../urls.js';

function jsonAttribute(element, name) {
  try { return JSON.parse(element?.getAttribute(name) || 'null'); }
  catch { return null; }
}
function report(element) {
  const click = jsonAttribute(element, 'data-bl-report-click');
  return click?.msg || jsonAttribute(element, 'data-report');
}
const numericId = value => /^\d+$/.test(String(value)) && Number(value) > 0;
function bannerUrl(value) {
  if (typeof value !== 'string' || !value) return '';
  // Report URLs are URI encoded once. Keep escapes inside the actual URL intact.
  if (/^(?:https?%3a|%2f)/i.test(value)) {
    try { value = decodeURIComponent(value); } catch { return ''; }
  }
  return urlOf(value)?.href || '';
}

// The production homepage does not expose Vue component instances. Its native
// DOM reports carry the same area IDs, room IDs and banner URLs as click handlers.
// Resolve at event time so lazy sections, carousel changes and recycled cards
// need no synthetic href attributes, observers or cached component state.
export function resolveLiveHomeLink(event) {
  if (pageId(location.href) !== 'LiveHome') return null;
  for (const node of event.composedPath()) {
    if (!(node instanceof Element)) continue;
    if (node.matches('input,textarea,button,[contenteditable="true"],.follow-btn,[data-player-pause-stop],.action-arrow-ctnr,.flip-dots-item')) return null;
    let url = '';
    if (node.matches('.sec-area-item,.highlight-area-item')) {
      const data = report(node);
      if (numericId(data?.parent_area_id) && (node.matches('.highlight-area-item') || numericId(data.area_id))) {
        url = `https://live.bilibili.com/p/eden/area-tags?parentAreaId=${data.parent_area_id}&areaId=${node.matches('.highlight-area-item') ? 0 : data.area_id}`;
      }
    } else if (node.matches('.room-card-ctnr,.aside-item')) {
      const data = report(node);
      if (numericId(data?.room_id)) {
        url = `https://live.bilibili.com/${data.room_id}`;
        if (data.session_id && data.session_id !== '-99998') url += `?session_id=${encodeURIComponent(data.session_id)}`;
      }
    } else if (node.matches('.item-wrapper,.small-banner,.bg-image[data-report]')) {
      const data = report(node) || report(node.querySelector('[data-report]'));
      url = bannerUrl(data?.url);
      // Category popup carousels omit data-report; their parent carries the
      // native banner list. Use the clicked slide's index, not the active slide.
      if (!url && node.matches('.item-wrapper')) {
        const banners = jsonAttribute(node.closest('.hover-panel-wrap[data-banner]'), 'data-banner');
        const index = Array.from(node.parentElement.children).filter(child => child.matches('.item-wrapper')).indexOf(node);
        // FlipView renders only entries with an imageUrl.
        if (Array.isArray(banners) && index >= 0) url = bannerUrl(banners.filter(item => item?.imageUrl)[index]?.link);
      }
    } else if (node.matches('.hover-panel-wrap')) return null;
    if (url) return {anchor:node, url};
    // A malformed/empty child card must never fall through to its parent area.
    if (node.matches('.sec-area-item,.item-wrapper,.small-banner,.room-card-ctnr,.aside-item')) return null;
  }
  return null;
}
