export function homeStyle(content = '') { return `
    /* 与 Feed 一致，原生滚动条配色跟随站点主题；所有宽度和滚动容器均生效。 */
    html.homepagescript-active { color-scheme:light!important; }
    html.homepagescript-active.bili_dark { color-scheme:dark!important; }
    html.homepagescript-active:has(link#__css-map__[href*="/light.css"]) { color-scheme:light!important; }
    html.homepagescript-active:has(link#__css-map__[href*="/dark.css"]) { color-scheme:dark!important; }
    html.homepagescript-active, html.homepagescript-active * { scrollbar-width:thin!important; scrollbar-color:auto!important; }
    .homepagescript-more, #homepagescript-menu { display:none; }
    @media (max-width:1099px) {
      html.homepagescript-active { --homepagescript-header-height:56px; }
      html.homepagescript-active, html.homepagescript-active body { min-width:0!important; overflow-x:clip!important; }
      html.homepagescript-active :is(.bili-feed4,.bili-header,.bili-header__banner,.bili-header__bar,.bili-header__channel,.header-channel,.bili-feed4-layout) {
        box-sizing:border-box!important; min-width:0!important; width:100%!important; max-width:100%!important;
      }
      html.homepagescript-active .bili-header__bar { height:var(--homepagescript-header-height)!important; padding:0 8px!important; }
      html.homepagescript-active .bili-header__bar :is(.left-entry,.menu-left) { display:flex!important; flex:0 0 auto!important; width:auto!important; min-width:0!important; }
      html.homepagescript-active .bili-header__bar .left-entry-main { display:flex!important; width:auto!important; min-width:0!important; }
      html.homepagescript-active .bili-header__bar :is(.home-page-entry,.home-page-panel-entry) { flex:none!important; }
      html.homepagescript-active .bili-header__bar :is(.home-page-entry,.home-page-panel-entry) > a { display:flex!important; align-items:center!important; white-space:nowrap!important; }
      html.homepagescript-active .bili-header__bar .menu-center { flex:1!important; min-width:0!important; width:auto!important; }
      html.homepagescript-active .bili-header__bar .menu-right { flex:0 0 auto!important; width:auto!important; min-width:0!important; }
      /* 定位原生外框，内容留在带背景/边框/阴影的 v-popover-content 内。 */
      html.homepagescript-active .v-popover:has(.bili-header-channel-panel) {
        position:fixed!important; left:8px!important; right:8px!important; top:var(--homepagescript-header-height)!important;
        bottom:auto!important; width:auto!important; min-width:0!important; margin:0!important; transform:none!important;
      }
      html.homepagescript-active .bili-header-channel-panel {
        box-sizing:border-box!important; width:100%!important; max-width:100%!important;
        display:grid!important; grid-template-columns:repeat(auto-fit,minmax(128px,1fr))!important;
        max-height:calc(100dvh - var(--homepagescript-header-height) - var(--broadcast-navigation-height,0px) - 24px)!important; overflow:auto!important;
      }
      html.homepagescript-active .bili-header-channel-panel .channel-panel__column { min-width:0!important; padding:0 8px!important; }
      html.homepagescript-active .bili-header-channel-panel .channel-panel__item { min-width:0!important; }
      html.homepagescript-active .bili-header__bar .center-search-container { display:block!important; flex:1!important; min-width:0!important; }
      html.homepagescript-active .bili-header__bar .center-search__bar { width:100%!important; min-width:0!important; max-width:none!important; }
      html.homepagescript-active .bili-header__bar .right-entry { flex:0 0 auto!important; }
      /* 主卡片和二级菜单留在原生父级内，保留悬停开合与点击行为。 */
      html.homepagescript-active :is(.bili-header__bar,.link-navbar) :is(.homepagescript-avatar-menu,.homepagescript-avatar-submenu) {
        position:fixed!important; left:var(--homepagescript-avatar-left,0px)!important; top:var(--homepagescript-avatar-top,0px)!important;
        right:auto!important; bottom:auto!important; margin:0!important; transform:none!important;
        zoom:var(--homepagescript-avatar-zoom,1)!important; transition-property:opacity!important;
      }
      html.homepagescript-active .bili-header__bar .homepagescript-avatar-submenu-left { padding-left:0!important; padding-right:10px!important; }
      html.homepagescript-active .bili-header__channel {
        display:grid!important; grid-template-columns:auto minmax(0,1fr)!important; grid-template-rows:auto 32px!important;
        align-items:center!important; gap:10px 12px!important; height:auto!important; padding:12px 8px!important; margin:0!important;
      }
      html.homepagescript-active .right-channel-container { display:contents!important; }
      html.homepagescript-active .channel-icons { grid-area:1 / 1!important; width:auto!important; height:auto!important; gap:12px!important; }
      html.homepagescript-active .channel-icons__item { width:auto!important; margin:0!important; }
      html.homepagescript-active .channel-icons__item .icon-bg { width:40px!important; height:40px!important; margin:0 auto 4px!important; }
      html.homepagescript-active .channel-items__right {
        /* 保留原版三列两行与逐列顺序，第三列为四字入口留出宽度。 */
        grid-area:1 / 2!important; display:grid!important; grid-template-columns:repeat(2,minmax(0,1fr)) minmax(0,1.35fr)!important;
        grid-template-rows:repeat(2,28px)!important; grid-auto-flow:column!important; gap:10px 4px!important;
        width:100%!important; min-width:0!important; padding:0!important; margin:0!important; border:0!important;
      }
      html.homepagescript-active .channel-items__left {
        grid-area:2 / 1 / 3 / -1!important; display:grid!important; grid-template-columns:repeat(var(--homepagescript-columns,2),minmax(0,1fr))!important;
        grid-template-rows:32px!important; grid-auto-flow:row!important; gap:6px!important;
        min-width:0!important; width:100%!important; margin:0!important; padding:0!important;
      }
      html.homepagescript-active :is(.channel-link,.channel-link__right,.channel-item) { min-width:0!important; width:auto!important; letter-spacing:normal!important; white-space:nowrap!important; }
      html.homepagescript-active .channel-link__right { display:flex!important; max-width:none!important; justify-content:center!important; gap:3px!important; }
      html.homepagescript-active .channel-items__right .side-text { display:block!important; -webkit-line-clamp:unset!important; flex:none!important; width:auto!important; max-width:none!important; overflow:visible!important; text-overflow:clip!important; letter-spacing:normal!important; }
      html.homepagescript-active .channel-items__right .side-icon { display:block!important; flex:none; width:24px!important; height:24px!important; }
      html.homepagescript-active .channel-link__more { display:none!important; }
      /* 原版固定栏按 64px 顶栏定位；窄屏顶栏为 56px，两者共用高度以消除缝隙。 */
      html.homepagescript-active .header-channel { left:0!important; right:0!important; top:var(--homepagescript-header-height)!important; margin-top:0!important; transition-property:opacity!important; }
      html.homepagescript-active .header-channel-fixed { box-sizing:border-box!important; width:100%!important; min-width:0!important; padding:10px 8px!important; gap:8px!important; }
      html.homepagescript-active .header-channel-fixed-left { flex:none!important; width:auto!important; gap:8px!important; }
      html.homepagescript-active .header-channel-fixed-center { flex:none!important; margin:0!important; }
      html.homepagescript-active .header-channel-fixed-right {
        display:grid!important; grid-template-columns:repeat(var(--homepagescript-columns,2),minmax(0,1fr))!important;
        grid-template-rows:28px!important; grid-auto-flow:row!important; gap:6px!important; min-width:0!important; flex:1!important;
      }
      html.homepagescript-active .header-channel-fixed-right > :is(.header-channel-fixed-list,.header-channel-fixed-side-list,.header-channel-fixed-bottom-list) { display:contents!important; }
      html.homepagescript-active .header-channel-fixed-arrow { display:none!important; }
      html.homepagescript-active .header-channel-fixed :is(.channel-item,.homepagescript-more) { height:28px!important; margin:0!important; padding:0 2px!important; overflow:hidden!important; text-overflow:ellipsis!important; }
      html.homepagescript-active .homepagescript-hidden { display:none!important; }
      html.homepagescript-active .homepagescript-more {
        display:flex; align-items:center; justify-content:center; gap:4px; min-width:0; width:100%; height:var(--item-height,28px); box-sizing:border-box;
        padding:0 2px; border:1px solid var(--line_light,#e3e5e7); border-radius:6px; background:var(--graph_bg_thin,#f6f7f8); color:var(--text2,#61666d); font:inherit; cursor:pointer;
      }
      html.homepagescript-active .homepagescript-more:hover { color:var(--brand_blue,#00aeec); }
      html.homepagescript-active #homepagescript-menu[data-open] {
        display:grid; position:fixed; z-index:3000; grid-template-columns:repeat(auto-fit,minmax(76px,1fr)); gap:6px;
        box-sizing:border-box; width:min(520px,calc(100vw - 16px)); max-height:var(--homepagescript-menu-height,60vh); overflow:auto;
        padding:10px; border:1px solid var(--line_regular,#e3e5e7); border-radius:8px;
        background:var(--bg1,#fff); color:var(--text1,#18191c); box-shadow:0 4px 20px #0003;
      }
      #homepagescript-menu a { display:flex; align-items:center; justify-content:center; min-height:32px; padding:2px 4px; border-radius:4px; color:inherit; text-decoration:none; font-size:13px; white-space:nowrap; }
      #homepagescript-menu a:hover { background:var(--graph_bg_thin,#f6f7f8); color:var(--brand_blue,#00aeec); }
      .homepagescript-more:focus-visible, #homepagescript-menu a:focus-visible { outline:2px solid #00aeec; outline-offset:1px; }
${content}
      html.homepagescript-active .bili-header__bar .offset-center-search { transform:none!important; position:relative!important; left:auto!important; }
    }
    @media (max-width:399px) {
      html.homepagescript-active .bili-header__channel { grid-template-rows:auto auto 32px!important; }
      html.homepagescript-active .channel-items__right { grid-area:2 / 1 / 3 / -1!important; }
      html.homepagescript-active .channel-items__left { grid-area:3 / 1 / 4 / -1!important; }
    }
  `; }
