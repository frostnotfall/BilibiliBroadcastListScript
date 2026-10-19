// Limit native hover/click targets to the displayed avatar circle. A transparent
// pseudo-element supplies the hit area, leaving pendant artwork unclipped.
export function createAvatarHover() {
  const roots = new Map(), properties = new Map();
  const style = Object.assign(document.createElement('style'), {textContent:`
    @media(max-width:1099px) {
      .homepagescript-avatar-circle,
      .homepagescript-avatar-circle > .v-popover-wrap,
      .homepagescript-avatar-circle .header-avatar-wrap--container,
      .homepagescript-avatar-circle .header-avatar-wrap--container * { pointer-events:none!important; }
      .homepagescript-avatar-circle > .v-popover-wrap > .v-popover,
      .homepagescript-avatar-circle.v-popover-wrap > .v-popover { pointer-events:auto; }
      .homepagescript-avatar-circle :is(.header-entry-mini,.header-entry-avatar)::after {
        content:''; position:absolute; left:var(--avatar-hit-x,0px); top:var(--avatar-hit-y,0px);
        width:var(--avatar-hit-size,100%); height:var(--avatar-hit-size,100%);
        border-radius:50%; clip-path:circle(50%); pointer-events:none;
      }
      .homepagescript-avatar-circle .header-avatar-wrap--container:not(.mini-avatar--large) .header-entry-mini::after,
      .homepagescript-avatar-circle .mini-avatar--large .header-entry-avatar::after { pointer-events:auto!important; }
    }
  `});
  let frame = 0, stopped = false;
  function restore(element) {
    for (const [name, saved] of properties.get(element) || []) {
      if (saved.value) element.style.setProperty(name, saved.value, saved.priority); else element.style.removeProperty(name);
    }
    properties.delete(element);
  }
  function circle(link) {
    const anchor = link.getBoundingClientRect();
    if (!anchor.width || !anchor.height || !link.offsetWidth || !link.offsetHeight) return;
    const visual = ['.bili-avatar-pendent-dom img','.bili-avatar-pendent-dom','.bili-avatar','.v-img','img']
      .map(selector => link.querySelector(selector)).find(element => element?.getBoundingClientRect().width && element.getBoundingClientRect().height);
    const box = visual?.getBoundingClientRect() || anchor;
    const scaleX = anchor.width / link.offsetWidth, scaleY = anchor.height / link.offsetHeight;
    const size = Math.min(box.width / scaleX, box.height / scaleY);
    const values = {'--avatar-hit-x':`${(box.left - anchor.left) / scaleX + (box.width / scaleX - size) / 2}px`,
      '--avatar-hit-y':`${(box.top - anchor.top) / scaleY + (box.height / scaleY - size) / 2}px`, '--avatar-hit-size':`${size}px`};
    if (!properties.has(link)) properties.set(link, new Map(Object.keys(values).map(name => [name, {
      value:link.style.getPropertyValue(name), priority:link.style.getPropertyPriority(name),
    }])));
    for (const [name,value] of Object.entries(values)) if (link.style.getPropertyValue(name) !== value) link.style.setProperty(name,value);
  }
  function refresh() {
    if (stopped) return;
    mutations.disconnect();
    if (!style.isConnected) document.head.append(style);
    const current = new Set(document.querySelectorAll('.bili-header__bar .header-avatar-wrap:has(.header-avatar-wrap--container .header-entry-mini)'));
    for (const [root, hadClass] of roots) if (!current.has(root)) {
      if (!hadClass) root.classList.remove('homepagescript-avatar-circle'); roots.delete(root);
    }
    for (const element of properties.keys()) if (!element.isConnected || !element.closest('.homepagescript-avatar-circle')) restore(element);
    for (const root of current) {
      if (!roots.has(root)) roots.set(root, root.classList.contains('homepagescript-avatar-circle'));
      if (!root.classList.contains('homepagescript-avatar-circle')) root.classList.add('homepagescript-avatar-circle');
      for (const link of root.querySelectorAll('.header-avatar-wrap--container > :is(.header-entry-mini,.header-entry-avatar)')) circle(link);
      mutations.observe(root, {subtree:true, childList:true, attributes:true, attributeFilter:['class','style']});
    }
  }
  function schedule() { if (!stopped && !frame) frame = requestAnimationFrame(() => {frame = 0; refresh();}); }
  const mutations = new MutationObserver(schedule), resize = new ResizeObserver(schedule);
  const selector = '.bili-header__bar .header-avatar-wrap';
  const discovery = new MutationObserver(records => {
    if (records.some(record => roots.has(record.target) || record.target.closest?.(selector) || [...record.addedNodes, ...record.removedNodes].some(node =>
      node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector))))) schedule();
  });
  discovery.observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['class']});
  resize.observe(document.documentElement); refresh();
  return {refresh, destroy() {
    stopped = true; mutations.disconnect(); discovery.disconnect(); resize.disconnect(); cancelAnimationFrame(frame);
    for (const element of [...properties.keys()]) restore(element);
    for (const [root, hadClass] of roots) if (!hadClass) root.classList.remove('homepagescript-avatar-circle');
    roots.clear(); style.remove();
  }};
}
