import {createLiveHeaderMenus} from './header-menus.js';

export function createLiveControls(options) {
  const {narrow, signal, ownClass, includeSidebar = true} = options;
  const header = createLiveHeaderMenus(options), sidebars = new Map();
  function restore(node, button) {
    ownClass(node, 'live-home-sidebar-collapsed', false);
    button.remove(); sidebars.delete(node);
  }
  return {contains:header.contains, update() {
    header.update();
    for (const [node, button] of sidebars) if (!narrow.matches || !node.isConnected) restore(node, button);
    if (!narrow.matches || !includeSidebar) return;
    for (const node of document.querySelectorAll('.live-sidebar-ctnr')) {
      if (sidebars.has(node)) continue;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'live-home-sidebar-toggle';
      const expand = value => {
        ownClass(node, 'live-home-sidebar-collapsed', !value);
        button.textContent = value ? '收起工具栏' : '展开工具栏'; button.setAttribute('aria-expanded', String(value));
      };
      expand(false); button.addEventListener('click', () => expand(button.getAttribute('aria-expanded') !== 'true'), {signal});
      node.before(button); sidebars.set(node, button);
    }
  }, destroy() { header.destroy(); for (const [node, button] of sidebars) restore(node, button); }};
}
