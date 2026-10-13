// Only the narrow Space favorites directory gets these controls. Native folder
// nodes, collapse state, links and action handlers remain owned by the site.
export function createFavoritesLayout() {
  let state = null;
  const groupAttribute = 'data-broadcast-fav-group';

  function clear() {
    if (!state) return;
    state.iconObserver.disconnect();
    state.events.abort(); state.navigation.remove(); state.toggle.remove();
    state.root.removeAttribute('data-broadcast-fav-layout');
    state.root.removeAttribute('data-broadcast-fav-open');
    state.page.removeAttribute('data-broadcast-favorites-active');
    for (const group of state.groups) {
      if (group.original === null) group.element.removeAttribute(groupAttribute);
      else group.element.setAttribute(groupAttribute, group.original);
    }
    state = null;
  }

  function syncCreateIcon() {
    if (!state) return;
    const markup = state.iconSource?.outerHTML || '';
    if (markup === state.iconMarkup) return;
    state.iconMarkup = markup;
    state.createIcon?.remove();
    state.createIcon = state.iconSource?.cloneNode(true) || null;
    if (state.createIcon) {
      state.createIcon.setAttribute('aria-hidden', 'true');
      state.create.prepend(state.createIcon);
    }
  }

  function render() {
    for (const group of state.groups) {
      const selected = group === state.selected;
      group.element.setAttribute(groupAttribute, selected ? 'selected' : 'hidden');
      group.button?.setAttribute('aria-pressed', String(selected));
    }
    state.root.setAttribute('data-broadcast-fav-open', String(state.open));
    state.create.hidden = !state.createGroup || state.selected !== state.createGroup;
    state.toggle.setAttribute('aria-expanded', String(state.open));
    const arrow = state.open ? '▴' : '▾';
    if (state.arrow.textContent !== arrow) state.arrow.textContent = arrow;
  }

  function refresh(active) {
    const root = active ? document.querySelector('.space-favlist .favlist-aside') : null;
    if (!root) { clear(); return; }
    const elements = Array.from(root.querySelectorAll(':scope > .vui_collapse > .fav-collapse'));
    const sources = elements.map(element => ({
      element, header:element.querySelector('.vui_collapse_item_header'),
      content:element.querySelector('.vui_collapse_item_content'),
    })).filter(group => group.header);
    if (!sources.some(group => group.content)) { clear(); return; }
    if (state && (state.root !== root || sources.length !== state.groups.length
        || sources.some((group, index) => group.element !== state.groups[index].element
          || group.header !== state.groups[index].header))) clear();
    if (!state) {
      const events = new AbortController();
      const navigation = document.createElement('div');
      navigation.className = 'broadcast-fav-navigation';
      const categories = document.createElement('nav');
      categories.className = 'broadcast-fav-categories'; categories.setAttribute('aria-label', '收藏分类');
      const shortcuts = document.createElement('nav');
      shortcuts.className = 'broadcast-fav-shortcuts'; shortcuts.setAttribute('aria-label', '收藏快捷入口');
      const create = document.createElement('button');
      create.type = 'button'; create.className = 'broadcast-fav-create'; create.hidden = true;
      const createLabel = document.createElement('span'); create.append(createLabel);
      shortcuts.append(create);
      create.addEventListener('click', () => {
        // Forward to the current native node, including after Vue replaces it.
        root.querySelector('.fav-collapse-create')?.click();
      }, {signal:events.signal});
      navigation.append(categories, shortcuts);
      const toggle = document.createElement('button');
      toggle.type = 'button'; toggle.className = 'broadcast-fav-directory-toggle';
      const label = document.createElement('span'); label.textContent = '收藏夹目录';
      const arrow = document.createElement('span'); arrow.setAttribute('aria-hidden', 'true');
      toggle.append(label, arrow);
      const groups = sources.map(group => ({...group, original:group.element.getAttribute(groupAttribute)}));
      const page = root.closest('.space-favlist');
      state = {root, page, navigation, categories, shortcuts, create, createLabel,
        createGroup:null, iconSource:null, iconMarkup:'', createIcon:null,
        iconObserver:new MutationObserver(syncCreateIcon), toggle, arrow, groups, events,
        selected:groups.find(group => group.content && group.element.querySelector('.vui_sidebar-item--active'))
          || groups.find(group => group.content), open:true, activeItem:null};
      for (const group of groups) {
        if (group.content) {
          const button = document.createElement('button');
          button.type = 'button'; group.button = button; categories.append(button);
          button.addEventListener('click', () => { state.selected = group; state.open = true; render(); }, {signal:events.signal});
        } else if (group.header instanceof HTMLAnchorElement) {
          // Plain native destination links; do not invent routes or copy Vue handlers.
          group.link = document.createElement('a'); shortcuts.append(group.link);
        }
      }
      toggle.addEventListener('click', () => { state.open = !state.open; render(); }, {signal:events.signal});
      root.setAttribute('data-broadcast-fav-layout', '');
      page.setAttribute('data-broadcast-favorites-active', '');
      root.prepend(navigation, toggle);
    }
    const nativeCreate = root.querySelector('.fav-collapse-create');
    state.createGroup = nativeCreate ? state.groups.find(group => group.element.contains(nativeCreate)) : null;
    if (nativeCreate && state.createLabel.textContent !== nativeCreate.textContent.trim()) {
      state.createLabel.textContent = nativeCreate.textContent.trim();
    }
    const nativeIcon = nativeCreate?.querySelector('svg,.vui_icon') || null;
    if (nativeIcon !== state.iconSource) {
      state.iconObserver.disconnect();
      state.iconSource = nativeIcon;
      if (nativeIcon) state.iconObserver.observe(nativeIcon, {childList:true,subtree:true,attributes:true});
    }
    // Vue may fill or update paths after mounting the SVG without replacing it.
    syncCreateIcon();
    for (const group of state.groups) {
      const label = group.header.textContent.trim();
      const control = group.button || group.link;
      if (control && control.textContent !== label) control.textContent = label;
      if (group.link) for (const name of ['href','target','rel','title']) {
        const value = group.header.getAttribute(name);
        if (value === null) { if (group.link.hasAttribute(name)) group.link.removeAttribute(name); }
        else if (group.link.getAttribute(name) !== value) group.link.setAttribute(name, value);
      }
    }
    const activeItem = root.querySelector('.vui_sidebar-item--active');
    if (activeItem !== state.activeItem) {
      const group = state.groups.find(group => group.content && group.element.contains(activeItem));
      if (group) { state.selected = group; state.open = true; }
      state.activeItem = activeItem;
    }
    render();
  }
  return {refresh, destroy:clear};
}
