import {avatarSubmenuPosition} from '../avatar-submenu-position.js';
export function createLiveAvatarLayout({html, narrow, ownClass, setProperty, restoreProperty, observe, schedule}) {
  const avatarMenus = new Map(), avatarTargets = new Set();
  let avatarMutations;
  const avatarProperties = ['--homepagescript-avatar-left', '--homepagescript-avatar-top', '--homepagescript-avatar-zoom'];
  function resetAvatarMenu(element, saved) {
    for (const name of ['homepagescript-avatar-menu','homepagescript-avatar-submenu','homepagescript-avatar-submenu-left']) ownClass(element,name,false);
    for (const name of avatarProperties) restoreProperty(element,name);
    saved.zoom = 1;
    saved.style = element.getAttribute('style');
  }

  function fitAvatarMenu(element, anchor, submenu, targets) {
      let saved = avatarMenus.get(element);
      if (!saved) {
        saved = {zoom:1, style:element.getAttribute('style')};
        avatarMenus.set(element, saved); observe(element);
      }
      for (const target of [element, element.parentElement, element.closest('.header-avatar-wrap,.user-panel-ctnr')]) if (target) targets.add(target);
      if (!narrow.matches) {
        if (element.classList.contains('homepagescript-avatar-menu') || element.classList.contains('homepagescript-avatar-submenu')) resetAvatarMenu(element, saved);
        return;
      }
      const className = submenu ? 'homepagescript-avatar-submenu' : 'homepagescript-avatar-menu';
      ownClass(element,className);
      const rect = element.getBoundingClientRect();
      if (rect.width && rect.height) {
        const anchorRect = anchor.getBoundingClientRect();
        const inset = parseFloat(getComputedStyle(html).getPropertyValue('--broadcast-navigation-height')) || 0;
        const menuTop = inset && submenu ? element.closest('.homepagescript-avatar-menu')?.getBoundingClientRect().top || 0 : 0;
        const minimumTop = Math.max(inset + 8, menuTop);
        let top = Math.max(minimumTop, Math.min(anchorRect.bottom, innerHeight - 16));
        const width = rect.width / saved.zoom, height = rect.height / saved.zoom;
        const zoom = Math.min(1, Math.max(1, html.clientWidth - 16) / width, Math.max(1, innerHeight - (submenu ? minimumTop + 8 : top + 8)) / height);
        let left;
        if (submenu) {
          const position = avatarSubmenuPosition(anchorRect, width * zoom, html.clientWidth);
          // padding 是原生悬停连接区；翻向左侧时也翻转 padding。
          ownClass(element,'homepagescript-avatar-submenu-left',position.opensLeft);
          left = position.left;
          top = Math.max(minimumTop, Math.min((anchorRect.top + anchorRect.bottom - height * zoom) / 2, innerHeight - height * zoom - 8));
        } else left = Math.max(8, Math.min(anchorRect.right - width * zoom, html.clientWidth - width * zoom - 8));
        // CSS zoom 同样缩放 fixed 坐标；包含页面已有的 zoom。
        const scale = rect.width / element.offsetWidth / saved.zoom * zoom;
        const values = [`${left / scale}px`, `${top / scale}px`, String(zoom)];
        avatarProperties.forEach((name, index) => {
          setProperty(element,name,values[index]);
        });
        saved.zoom = zoom;
      }
      saved.style = element.getAttribute('style');
  }

  function positionAvatarMenus() {
    const targets = new Set();
    for (const element of document.querySelectorAll('.bili-header__bar .header-avatar-wrap > .v-popover-wrap > .v-popover,.bili-header__bar .header-avatar-wrap.v-popover-wrap > .v-popover,.link-navbar .user-panel-ctnr > .user-panel')) {
      const anchor = element.parentElement.querySelector('.header-avatar-wrap--container') || element.closest('.header-avatar-wrap,.user-panel-ctnr');
      fitAvatarMenu(element, anchor, false, targets);
      for (const submenu of element.querySelectorAll('.v-popover-wrap > .v-popover:is(.is-right,.is-left)')) {
        fitAvatarMenu(submenu, submenu.parentElement, true, targets);
      }
    }
    for (const [element, saved] of avatarMenus) if (!targets.has(element)) {
      resetAvatarMenu(element, saved); avatarMenus.delete(element);
    }
    if (targets.size !== avatarTargets.size || Array.from(targets).some(element => !avatarTargets.has(element))) {
      avatarMutations.disconnect(); avatarTargets.clear();
      for (const element of targets) {
        avatarTargets.add(element);
        avatarMutations.observe(element, { attributes:true, attributeFilter:['class','style'] });
      }
    }
  }
  function startObserving() {
    avatarMutations = new MutationObserver(records => {
      if (records.some(record => record.attributeName !== 'style' || !avatarMenus.has(record.target)
        || avatarMenus.get(record.target).style !== record.target.getAttribute('style'))) schedule();
    });
  }
  function disconnect() { avatarMutations.disconnect(); }
  function destroy() {
    for (const [element,saved] of avatarMenus) resetAvatarMenu(element,saved);
    avatarMenus.clear(); avatarTargets.clear();
  }
  // Separate observation shutdown from layout restoration to retain runtime cleanup order.
  return {update:positionAvatarMenus, startObserving, disconnect, destroy};
}
