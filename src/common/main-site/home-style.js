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
      html.homepagescript-active .bili-header__bar .menu-center { flex:1!important; min-width:0!important; width:auto!important; margin:0 8px!important; }
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
      html.homepagescript-active .bili-header__bar .center-search-container { display:block!important; flex:1!important; min-width:0!important; width:auto!important; margin:0 8px!important; }
      html.homepagescript-active .bili-header__bar .menu-center .center-search-container { margin:0!important; }
      html.homepagescript-active .bili-header__bar .center-search__bar { width:100%!important; min-width:0!important; max-width:none!important; }
      html.homepagescript-active .bili-header__bar :is(#nav-searchform,#nav_searchform,.nav-search-content,.nav-search-input) { box-sizing:border-box!important; min-width:0!important; }
      html.homepagescript-active .bili-header__bar .nav-search-input { width:100%!important; }
      html.homepagescript-active .bili-header__bar .nav-search-clean { flex:none!important; }
      html.homepagescript-active .bili-header__bar :is(#nav-searchform,#nav_searchform) { width:100%!important; }
      html.homepagescript-active .bili-header__bar .right-entry { flex:0 0 auto!important; width:auto!important; min-width:0!important; }
      html.homepagescript-active .bili-header__bar .right-entry__main { gap:8px!important; }
      html.homepagescript-active .bili-header__bar .right-entry__item { min-width:28px!important; margin:0!important; }
      html.homepagescript-active .bili-header__bar .right-entry__item-trigger .trigger-text { display:block!important; font-size:12px!important; white-space:nowrap!important; }
      /* 外框留在原生悬停区域内；只调整坐标和尺寸，保留背景、状态及内容事件。 */
      html.homepagescript-active .bili-header__bar .homepagescript-header-card {
        position:fixed!important; left:var(--homepagescript-card-left,8px)!important; top:var(--homepagescript-card-top,var(--homepagescript-header-height))!important;
        right:auto!important; bottom:auto!important; margin:0!important; transform:none!important;
        box-sizing:border-box!important; min-width:0!important; max-width:calc(100vw - 16px)!important; transition-property:opacity!important;
      }
      html.homepagescript-active :is(.favorite-entry,.history-entry) .homepagescript-header-card { padding-top:8px!important; }
      html.homepagescript-active .favorite-entry .homepagescript-header-card { width:min(522px,calc(100vw - 16px))!important; }
      html.homepagescript-active .history-entry .homepagescript-header-card { width:min(372px,calc(100vw - 16px))!important; }
      html.homepagescript-active .history-entry .homepagescript-header-card:has(.continuous-history-card) { width:min(302px,calc(100vw - 16px))!important; }
      html.homepagescript-active .right-entry__item:has(:is([data-idx="fav"],[data-idx="history"])) .homepagescript-header-card { width:min(372px,calc(100vw - 16px))!important; padding-top:8px!important; }
      html.homepagescript-active .homepagescript-header-card :is(.continuous-history-card,.right-entry__item-unlogin-panel) { box-sizing:border-box!important; width:100%!important; min-width:0!important; }
      html.homepagescript-active .homepagescript-header-card > .v-popover-content { box-sizing:border-box!important; width:100%!important; min-width:0!important; max-height:calc(var(--homepagescript-card-height) - 8px)!important; overflow:auto!important; }
      html.homepagescript-active .homepagescript-header-card :is(.favorite-panel-popover,.history-panel-popover) { box-sizing:border-box!important; width:100%!important; min-width:0!important; height:min(540px,calc(var(--homepagescript-card-height) - 10px))!important; }
      html.homepagescript-active .homepagescript-header-card .history-panel-popover { display:flex!important; flex-direction:column!important; }
      html.homepagescript-active .homepagescript-header-card .header-tabs-panel { flex:none!important; }
      html.homepagescript-active .homepagescript-header-card .header-tabs-panel__content { flex:1!important; min-height:0!important; height:auto!important; overflow-y:auto!important; }
      html.homepagescript-active .homepagescript-header-card .view-all-history-btn { max-width:calc(100% - 24px)!important; }
      html.homepagescript-active .homepagescript-header-card .favorite-panel-popover__nav { height:100%!important; }
      html.homepagescript-active .homepagescript-header-card .favorite-panel-popover__content { display:flex!important; flex-direction:column!important; flex:1!important; min-width:0!important; height:100%!important; }
      html.homepagescript-active .homepagescript-header-card .content-scroll { flex:1!important; min-height:0!important; height:auto!important; overflow-y:auto!important; }
      html.homepagescript-active .homepagescript-header-card .content-bottom { position:static!important; flex:none!important; }
      html.homepagescript-active .center-search-container .homepagescript-header-card { width:min(500px,calc(100vw - 16px))!important; padding:0!important; max-height:var(--homepagescript-card-height)!important; overflow-y:auto!important; }
      html.homepagescript-active .homepagescript-header-card .search-panel { box-sizing:border-box!important; max-height:var(--homepagescript-card-height)!important; }
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
    @media (max-width:559px) {
      html.homepagescript-active .homepagescript-header-card .favorite-panel-popover { flex-direction:column!important; }
      html.homepagescript-active .homepagescript-header-card .favorite-panel-popover__nav { display:flex!important; width:100%!important; height:58px!important; flex:none!important; padding:4px 0!important; border-right:0!important; overflow-x:auto!important; overflow-y:hidden!important; }
      html.homepagescript-active .homepagescript-header-card .favorite-panel-popover__nav .tab-item { flex:none!important; }
      html.homepagescript-active .homepagescript-header-card .favorite-panel-popover__content { min-height:0!important; height:auto!important; }
    }
    @media (max-width:399px) {
      html.homepagescript-active .bili-header__channel { grid-template-rows:auto auto 32px!important; }
      html.homepagescript-active .channel-items__right { grid-area:2 / 1 / 3 / -1!important; }
      html.homepagescript-active .channel-items__left { grid-area:3 / 1 / 4 / -1!important; }
    }
  `; }
