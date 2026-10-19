// Background work leaves one slot free for a click. Pending user actions are
// never evicted; completed results use a bounded, expiring LRU cache.
export function createResolverCache(start, {concurrency = 4, maxQueued = 128, capacity = 256, ttl = 300000, retryDelay = 30000} = {}) {
  const entries = new Map(), urgent = new Set(), background = new Set();
  let stopped = false, running = 0, pumping = false;
  function touch(url, entry) { entries.delete(url); entries.set(url, entry); }
  function trim() {
    const now = Date.now();
    for (const [url, entry] of entries) if (entry.state === 'done' && (entry.expires <= now || entries.size > capacity)) entries.delete(url);
  }
  function pump() {
    if (stopped || pumping) return;
    pumping = true;
    try {
      while (running < concurrency) {
        const entry = urgent.values().next().value || (running < Math.max(1, concurrency - 1) && background.values().next().value);
        if (!entry) break;
        urgent.delete(entry); background.delete(entry);
        entry.state = 'running'; running++;
        try {
          const cancel = start(entry.key, entry.finish);
          if (entry.state === 'running') entry.cancel = cancel;
        }
        catch { entry.finish(''); }
      }
    } finally { pumping = false; }
  }
  function resolve(url, priority = true) {
    if (stopped) return Promise.resolve('');
    trim();
    let entry = entries.get(url);
    // A failed prefetch backs off; an explicit action can retry immediately.
    if (priority && entry?.state === 'done' && !entry.value) { entries.delete(url); entry = null; }
    if (entry) {
      touch(url, entry);
      if (priority && entry.state === 'queued') { background.delete(entry); urgent.add(entry); pump(); }
      return entry.promise;
    }
    if (!priority && background.size >= maxQueued) return Promise.resolve('');
    let settle;
    entry = {key:url, state:'queued', value:'', cancel:null, promise:new Promise(resolve => { settle = resolve; })};
    entry.finish = value => {
      if (entry.state === 'done') return;
      if (entry.state === 'running') running--;
      urgent.delete(entry); background.delete(entry);
      entry.state = 'done'; entry.value = value || ''; entry.cancel = null;
      entry.expires = Date.now() + (entry.value ? ttl : retryDelay);
      touch(url, entry); settle(entry.value); trim(); pump();
    };
    entries.set(url, entry);
    (priority ? urgent : background).add(entry); pump();
    return entry.promise;
  }
  return {
    resolve, prefetch:url => resolve(url, false),
    peek(url) {
      const entry = entries.get(url);
      if (!entry || entry.state !== 'done') return '';
      if (entry.expires <= Date.now()) { entries.delete(url); return ''; }
      touch(url, entry); return entry.value;
    },
    destroy() {
      stopped = true;
      for (const entry of [...entries.values()]) {
        entry.cancel?.(); entry.finish('');
      }
      urgent.clear(); background.clear(); entries.clear();
    },
  };
}
