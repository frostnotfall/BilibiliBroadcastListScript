import {urlOf, isShortUrl} from './urls.js';

class WatchlaterError extends Error {}

const aidOf = value => /^[1-9]\d*$/.test(String(value ?? '')) ? String(value) : '';
const bvidOf = value => /^BV[0-9A-Za-z]{10}$/.test(String(value ?? '')) ? String(value) : '';

function linkVideo(value) {
  const url = urlOf(value);
  if (url?.hostname !== 'www.bilibili.com') return {};
  const match = /^\/video\/(BV[0-9A-Za-z]{10}|av[1-9]\d*)\/?$/.exec(url.pathname);
  if (match) return match[1].startsWith('av') ? {aid:match[1].slice(2)} : {bvid:match[1]};
  // Native Watchlater cards use this route; a list's "play all" has no bvid.
  if (/^\/list\/watchlater\/?$/.test(url.pathname)) return {bvid:bvidOf(url.searchParams.get('bvid'))};
  return {};
}

// Snapshot only the clicked link/card, never page-wide video state or a sibling.
export function watchlaterTarget(target, resolvedUrl = target.url) {
  const url = urlOf(resolvedUrl);
  const video = linkVideo(resolvedUrl);
  const eligible = url?.hostname === 'www.bilibili.com' && /^\/video\//.test(url.pathname)
    || Boolean(video.bvid) || isShortUrl(resolvedUrl);
  if (!eligible) return null;
  const card = target.anchor?.closest?.('.bili-video-card,.video-card,.video-item,.small-item,.rank-item,.history-record,.bili-dyn-item,[data-aid],[data-bvid]');
  const aid = aidOf(target.aid) || aidOf(target.anchor?.dataset?.aid) || aidOf(card?.dataset?.aid);
  const bvid = bvidOf(target.bvid) || bvidOf(target.anchor?.dataset?.bvid) || bvidOf(card?.dataset?.bvid);
  return {aid:aid || (!bvid && video.aid) || '', bvid:bvid || video.bvid || '', url:resolvedUrl};
}

function cookie(name) {
  const value = document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith(name + '='));
  if (!value) return '';
  try { return decodeURIComponent(value.slice(name.length + 1)); } catch { return ''; }
}

export function createWatchlater({resolveUrl}) {
  const pending = new Map();
  const events = new AbortController();
  function add(target) {
    const keys = [target.aid && 'av' + target.aid, target.bvid, target.url].filter(Boolean);
    const existing = keys.map(key => pending.get(key)).find(Boolean);
    if (existing) return existing;
    const operation = submit(target).finally(() => {
      for (const key of keys) if (pending.get(key) === operation) pending.delete(key);
    });
    for (const key of keys) pending.set(key, operation);
    return operation;
  }
  async function submit(target) {
    if (events.signal.aborted) throw new WatchlaterError('操作已取消');
    let {aid, bvid} = target;
    if (!aid && !bvid) ({aid, bvid} = linkVideo(await resolveUrl(target.url)));
    if (!aid && !bvid) throw new WatchlaterError('无法识别当前视频，请检查视频链接');
    if (!cookie('DedeUserID')) throw new WatchlaterError('请先登录 B 站后再添加到稍后再看');
    const csrf = cookie('bili_jct');
    if (!csrf) throw new WatchlaterError('缺少 CSRF（bili_jct），请重新登录 B 站后重试');
    const controller = new AbortController();
    const abort = () => controller.abort();
    events.signal.addEventListener('abort', abort, {once:true});
    if (events.signal.aborted) controller.abort();
    const timer = setTimeout(abort, 15000);
    try {
      // Native WebView2 page: its Cookie store owns login, including HttpOnly
      // session cookies. The playback postMessage bridge has no HTTP contract.
      const response = await fetch('https://api.bilibili.com/x/v2/history/toview/add', {
        method:'POST', credentials:'include', signal:controller.signal,
        headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({...(aid ? {aid} : {bvid}), csrf}).toString(),
      });
      let result;
      try { result = await response.json(); }
      catch { throw new WatchlaterError('添加失败：服务器返回了无效响应，请重试'); }
      if (result?.code === -101) throw new WatchlaterError('登录已失效，请重新登录 B 站后重试');
      if (result?.code === -111) throw new WatchlaterError('CSRF 校验失败，请重新登录 B 站后重试');
      if (!response.ok) throw new WatchlaterError('添加失败：HTTP ' + response.status + '，请重试');
      if (result?.code !== 0) {
        // Never echo server messages or exceptions which might contain tokens.
        const code = Number.isInteger(result?.code) ? '（错误码 ' + result.code + '）' : '';
        throw new WatchlaterError('添加到稍后再看失败' + code + '，请重试');
      }
    } catch (error) {
      if (controller.signal.aborted) throw new WatchlaterError(events.signal.aborted ? '操作已取消' : '请求超时，请重试');
      if (error instanceof WatchlaterError) throw error;
      throw new WatchlaterError('网络请求失败，请检查网络或跨域访问设置后重试');
    } finally {
      clearTimeout(timer); events.signal.removeEventListener('abort', abort);
    }
  }
  return {add, destroy() {events.abort(); pending.clear();}};
}
