// Dynamic cards have the same DOM on Feed and Space. Page shells stay separate.
const cards = ['video','article','pgc','goods'].map(type => `.bili-dyn-card-${type}`);
const cardText = cards.flatMap(selector => [`${selector}__title`,`${selector}__desc`]).join(',');
const content = '.bili-dyn-item__main,.bili-dyn-content,.bili-dyn-content__orig';
const fullWidth = `.bili-dyn-list,.bili-dyn-list__items,.bili-dyn-item,${cards}`;
export const dynamicSelectors = {cards,content,fullWidth};

// Caller encloses this CSS in its own narrow-screen gate.
export function dynamicContentStyle(scope, prefix = 'feedscript') {
  return `
    ${scope} :is(${fullWidth},${content}), ${scope} .${prefix}-fit { box-sizing:border-box!important; min-width:0!important; max-width:100%!important; }
    ${scope} :is(${fullWidth}) { width:100%!important; margin-left:0!important; margin-right:0!important; }
    ${scope} :is(.bili-dyn-content,${cardText}) { overflow-wrap:anywhere; }
    ${scope} :is(img,video,iframe,canvas) { max-width:100%!important; }
    ${scope} .bili-dyn-card-video__body { min-width:0!important; flex:1!important; }
    @media(max-width:399px) {
      ${scope} .bili-dyn-card-video__header { width:42%!important; max-width:42%!important; flex-shrink:0!important; }
      ${scope} .bili-dyn-card-video__cover { width:100%!important; }
    }
    ${scope} .${prefix}-media { box-sizing:border-box!important; min-width:0!important; max-width:none!important; width:var(--${prefix}-media-width,revert)!important; zoom:var(--${prefix}-scale,1)!important; }
    ${scope} .${prefix}-media :is(img,video,canvas) { max-width:none!important; }
    ${scope} img.${prefix}-media { height:auto!important; }
    ${scope} .${prefix}-image-tools {
      display:flex!important; flex-wrap:wrap!important; align-items:center!important; justify-content:flex-start!important; gap:4px 12px!important; box-sizing:border-box!important;
      min-width:0!important; white-space:nowrap!important; word-break:normal!important; overflow-wrap:normal!important;
      height:auto!important; padding:4px 0!important; font-size:12px!important; line-height:20px!important;
      width:100%!important; zoom:calc(1 / var(--${prefix}-scale,1))!important;
    }
    ${scope} .${prefix}-image-tools > * { display:flex!important; flex-direction:row!important; align-items:center!important; gap:4px!important; flex:0 0 auto!important; width:auto!important; height:auto!important; min-width:max-content!important; min-height:24px!important; margin:0!important; padding:0!important; font-size:inherit!important; line-height:inherit!important; }
    ${scope} .${prefix}-image-tools * { white-space:nowrap!important; word-break:normal!important; overflow-wrap:normal!important; }
    ${scope} .${prefix}-image-tools :is(span,a,button,div) { width:auto!important; min-width:max-content!important; font-size:inherit!important; line-height:inherit!important; }
    ${scope} .${prefix}-image-tools > * > * { flex-shrink:0!important; margin:0!important; }
  `;
}

export function createDynamicContent({getRoot, prefix = 'feedscript', popup = '[role="tooltip"],[role="dialog"],[class*="popover"],[class*="popper"],[class*="image-viewer"],[class*="image-preview"]', isActive = () => true}) {
  const events = new AbortController(), states = new Map(), titles = new Map();
  let stopped = false, root = null, frame = 0, width = -1, discover = true;
  const saveStyles = (element,names) => new Map(names.map(name => [name,{
    value:element.style.getPropertyValue(name),priority:element.style.getPropertyPriority(name),
  }]));
  function mark(state, element, name) {
    const className = prefix + '-' + name;
    if(element.classList.contains(className)) return;
    if(!state.classes.has(element)) state.classes.set(element,new Set());
    state.classes.get(element).add(className); element.classList.add(className);
  }
  function release(state) {
    for(const [element,styles] of state.styles) for(const [name,{value,priority}] of styles) {
      if(value) element.style.setProperty(name,value,priority); else element.style.removeProperty(name);
    }
    for(const [element,names] of state.classes) for(const name of names) element.classList.remove(name);
    state.styles.clear(); state.classes.clear();
  }
  function restoreTitle(element, {original,value}) {
    if(element.title!==value) return;
    if(original===null) element.removeAttribute('title'); else element.setAttribute('title',original);
  }
  function owner(node) {
    for(let element=node.nodeType===1 ? node : node.parentElement; element; element=element.parentElement) {
      if(states.has(element)) return element;
      if(element===root) break;
    }
    return null;
  }
  function changed(records) {
    for(const record of records) {
      const unit=owner(record.target);
      if(unit) states.get(unit).dirty=true;
      if(!unit || unit===root) discover=true;
      if(!unit && record.type==='attributes') for(const [element,state] of states) {
        if(record.target.contains(element)) state.dirty=true;
      }
    }
  }
  function schedule() {
    if(!stopped && !frame) frame=requestAnimationFrame(() => {frame=0;refresh();});
  }
  const mutations=new MutationObserver(records => {changed(records);schedule();});
  const resize=new ResizeObserver(records => {
    let changed=false;
    for(const record of records) {
      const state=states.get(record.target);
      if(state && record.target.clientWidth!==state.width) {state.dirty=true;changed=true;}
    }
    if(changed || root && root.clientWidth!==width) schedule();
  });
  function collectMedia(root) {
    // Keep the outer native album intact, including its viewer controls.
    const roots = [...root.querySelectorAll('[class*="album" i]')].filter(element => !element.closest(popup) &&
      (element.querySelector('img,picture') || [...element.children].some(child => getComputedStyle(child).backgroundImage.includes('url('))));
    for(const image of root.querySelectorAll('.bili-dyn-item img')) {
      if(roots.some(album=>album.contains(image)) || image.closest(`${popup},[class*="bili-dyn-card"],[class*="avatar"]`)) continue;
      if(image.scrollWidth<=80 && !/\/bfs\/(album|new_dyn)\//.test(image.currentSrc || image.src)) continue;
      let album=image;
      while(album.parentElement && album.parentElement!==root && !album.parentElement.matches(`.bili-dyn-item,${content}`) && !album.parentElement.textContent.replace(/GIF/g,'').trim()) album=album.parentElement;
      roots.push(album);
    }
    return roots.filter(element=>!roots.some(other=>other!==element && other.contains(element)));
  }
  function isTools(element) {
    const text=element.textContent.replace(/\s/g,'');
    return ['收起','查看大图','向左旋转','向右旋转'].every(label=>text.includes(label));
  }
  function refresh() {
    if(frame) {cancelAnimationFrame(frame);frame=0;}
    const next=getRoot();
    if(stopped || !isActive() || !next) {clear();return;}
    if(next!==root) {
      clear(); root=next;
      mutations.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style','hidden','src','srcset']});
      resize.observe(root);
    }
    // A caller may refresh before the observer callback is delivered.
    changed(mutations.takeRecords());
    for(const [element,state] of states) if(!root.contains(element)) {release(state);resize.unobserve(element);states.delete(element);}
    for(const [element,state] of titles) if(!root.contains(element)) {restoreTitle(element,state);titles.delete(element);}
    if(discover) {
      const units=[...root.querySelectorAll('.bili-dyn-item')].filter(element => !element.parentElement.closest('.bili-dyn-item') || !root.contains(element.parentElement.closest('.bili-dyn-item')));
      const current=new Set(units.length ? units : [root]);
      for(const [element,state] of states) if(!current.has(element)) {release(state);resize.unobserve(element);states.delete(element);}
      for(const unit of current) if(!states.has(unit)) {
        states.set(unit,{dirty:true,width:-1,styles:new Map(),classes:new Map()}); resize.observe(unit);
      }
      discover=false;
    }
    const resized=root.clientWidth!==width; width=root.clientWidth;
    const pending=[...states].filter(([,state]) => resized || state.dirty);
    // Restore every affected card first. Native measurement must not inherit our zoom.
    for(const [,state] of pending) release(state);
    const batches=pending.map(([unit,state]) => {
      const images=collectMedia(unit), tools=[];
      for(const tool of unit.querySelectorAll('*')) {
        if(tool.children.length>=2 && !tool.closest(popup) && isTools(tool) && ![...tool.children].some(isTools)) tools.push(tool);
      }
      return {state,images,tools};
    });
    for(const {state,images,tools} of batches) {
      for(const tool of tools) mark(state,tool,'image-tools');
      for(const element of images) for(let parent=element.parentElement;parent && parent!==root;parent=parent.parentElement) {
        mark(state,parent,'fit'); if(parent.matches('.bili-dyn-item')) break;
      }
    }
    // All geometry reads precede scale writes, avoiding a layout flush per image.
    const measurements=[];
    for(const {state,images} of batches) for(const element of images) {
      const parent=element.parentElement, css=getComputedStyle(parent);
      const available=parent.clientWidth-(parseFloat(css.paddingLeft)||0)-(parseFloat(css.paddingRight)||0);
      const natural=Math.max(element.scrollWidth,element.getBoundingClientRect().width);
      const scale=Math.min(1,Math.max(0,available)/Math.max(1,natural));
      if(natural && scale && scale!==1) measurements.push({state,element,natural,scale});
    }
    for(const {state,element,natural,scale} of measurements) {
      mark(state,element,'media');
      const values={['--'+prefix+'-media-width']:natural+'px',['--'+prefix+'-scale']:String(scale)};
      state.styles.set(element,saveStyles(element,Object.keys(values)));
      for(const [name,value] of Object.entries(values)) element.style.setProperty(name,value,'important');
    }
    for(const [unit,state] of pending) {state.dirty=false;state.width=unit.clientWidth;}
    // Discard only records generated by our synchronous restore/measure/apply pass.
    mutations.takeRecords();
  }
  function onTitle(event) {
    if(stopped || !isActive()) return;
    const current=getRoot(), element=event.target instanceof Element ? event.target.closest(cardText) : null;
    if(!element || !current?.contains(element)) return;
    const text=[...element.closest(cards).querySelectorAll(cardText)].map(field=>field.textContent.trim()).filter(Boolean).join('\n\n');
    let state=titles.get(element);
    if(state && element.title!==state.value) {titles.delete(element);state=null;}
    if(!text || element.title===text) return;
    if(!state) titles.set(element,{original:element.getAttribute('title'),value:text});
    else state.value=text;
    element.title=text;
  }
  function clear() {
    mutations.disconnect(); resize.disconnect(); cancelAnimationFrame(frame); frame=0;
    for(const state of states.values()) release(state);
    for(const [element,state] of titles) restoreTitle(element,state);
    states.clear(); titles.clear(); root=null; width=-1; discover=true;
  }
  document.addEventListener('load', event => {
    if(!root?.contains(event.target)) return;
    const unit=owner(event.target);
    if(unit) states.get(unit).dirty=true;
    schedule();
  },{capture:true,signal:events.signal});
  window.addEventListener('resize', () => {
    for(const state of states.values()) state.dirty=true;
    schedule();
  },{signal:events.signal});
  for(const type of ['mouseover','focusin']) document.addEventListener(type,onTitle,{signal:events.signal});
  return {refresh,clear,destroy() {stopped=true;events.abort();clear();}};
}
