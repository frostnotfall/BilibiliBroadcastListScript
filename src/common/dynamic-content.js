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
  const events = new AbortController(), mediaStyles = new Map(), classes = new Map(), titles = new Map();
  let stopped = false;
  const saveStyles = (element,names) => new Map(names.map(name => [name,{
    value:element.style.getPropertyValue(name),priority:element.style.getPropertyPriority(name),
  }]));
  function restoreStyles(element,values) {
    for(const [name,{value,priority}] of values) {
      if(value) element.style.setProperty(name,value,priority); else element.style.removeProperty(name);
    }
  }
  function mark(element,name) {
    const className = `${prefix}-${name}`;
    if(element.classList.contains(className)) return;
    if(!classes.has(element)) classes.set(element,new Set());
    classes.get(element).add(className);element.classList.add(className);
  }
  function clearMedia() {
    for(const [element,styles] of mediaStyles) restoreStyles(element,styles);
    mediaStyles.clear();
    for(const [element,names] of classes) for(const name of names) element.classList.remove(name);
    classes.clear();
  }
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
    clearMedia();
    const root=getRoot();
    if(stopped || !isActive() || !root) {clear();return;}
    const images=collectMedia(root);
    // Expanded controls may be siblings of the image or already fit without zoom.
    for(const tool of root.querySelectorAll('*')) {
      if(tool.children.length>=2 && !tool.closest(popup) && isTools(tool) && ![...tool.children].some(isTools)) mark(tool,'image-tools');
    }
    for(const element of images) {
      for(let parent=element.parentElement;parent && parent!==root;parent=parent.parentElement) {
        mark(parent,'fit');if(parent.matches('.bili-dyn-item')) break;
      }
    }
    // Measure native dimensions again before each scale, avoiding compounded zoom.
    for(const element of images) {
      const css=getComputedStyle(element.parentElement);
      const available=element.parentElement.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight);
      const natural=Math.max(element.scrollWidth,element.getBoundingClientRect().width);
      const scale=Math.min(1,Math.max(0,available)/Math.max(1,natural));
      if(!natural || !scale || scale===1) continue;
      mark(element,'media');
      const values={ [`--${prefix}-media-width`]:`${natural}px`, [`--${prefix}-scale`]:String(scale) };
      mediaStyles.set(element,saveStyles(element,Object.keys(values)));
      for(const [name,value] of Object.entries(values)) element.style.setProperty(name,value,'important');
    }
  }
  function onTitle(event) {
    if(stopped || !isActive()) return;
    const root=getRoot(), element=event.target instanceof Element ? event.target.closest(cardText) : null;
    if(!element || !root?.contains(element)) return;
    const text=[...element.closest(cards).querySelectorAll(cardText)].map(field=>field.textContent.trim()).filter(Boolean).join('\n\n');
    let state=titles.get(element);
    if(state && element.title!==state.value) {titles.delete(element);state=null;}
    if(!text || element.title===text) return;
    if(!state) titles.set(element,{original:element.getAttribute('title'),value:text});
    else state.value=text;
    element.title=text;
  }
  function clear() {
    clearMedia();
    for(const [element,{original,value}] of titles) if(element.title===value) {
      if(original===null) element.removeAttribute('title'); else element.setAttribute('title',original);
    }
    titles.clear();
  }
  for(const type of ['mouseover','focusin']) document.addEventListener(type,onTitle,{signal:events.signal});
  return {refresh,clear,destroy() {stopped=true;events.abort();clear();}};
}
