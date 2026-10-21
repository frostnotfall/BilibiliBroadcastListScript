import {homeStyle} from '../../common/main-site/home-style.js';

export function pageStyle() {
  let css = homeStyle();
  css += "\n@media(max-width:1099px) {\nhtml.homepagescript-active :is(.bili-footer,.b-footer-wrap,.footer) {box-sizing:border-box!important;min-width:0!important;width:100%!important;padding:12px!important;}\nhtml.homepagescript-active :is(.link-box,.other-link,.link-item__right) {flex-wrap:wrap!important;gap:12px!important;width:100%!important;}\nhtml.homepagescript-active :is(.link-item,.text-con,.text-con__line) {min-width:0!important;width:100%!important;white-space:normal!important;overflow-wrap:anywhere!important;}\n}@media(max-width:1099px) {\nhtml.homepagescript-active .popular-container {box-sizing:border-box!important;width:100%!important;min-width:0!important;padding:8px!important;margin:0!important;}\nhtml.homepagescript-active .nav-tabs {overflow-x:auto!important;gap:8px!important;}\nhtml.homepagescript-active .nav-tabs__item {flex-shrink:0!important;}\nhtml.homepagescript-active .card-list {display:grid!important;grid-template-columns:repeat(var(--homepagescript-columns,2),minmax(0,1fr))!important;gap:16px 12px!important;}\nhtml.homepagescript-active .video-card {display:flex!important;flex-direction:column!important;width:100%!important;min-width:0!important;margin:0!important;height:auto!important;}\nhtml.homepagescript-active :is(.video-card__content,.video-card__info) {box-sizing:border-box!important;width:100%!important;min-width:0!important;height:auto!important;padding:0!important;}\nhtml.homepagescript-active .video-card__content {aspect-ratio:16/9;}\nhtml.homepagescript-active .video-card__content :is(a,img) {width:100%!important;height:100%!important;}\nhtml.homepagescript-active .video-name {width:100%!important;margin:8px 0!important;}\n}";
  css += `
    @media(max-width:1099px) {
      html.homepagescript-active .weekly-list .video-list { display:grid!important; grid-template-columns:repeat(var(--homepagescript-columns,2),minmax(0,1fr))!important; gap:16px 12px!important; }
      html.homepagescript-active .popular-container :is(.popular-video-container,.rank-container,.flow-loader,.rank-list-wrap) { min-width:0!important; max-width:100%!important; }
      html.homepagescript-active .popular-container :is(.popular-tips,.weekly-header) { flex-wrap:wrap!important; gap:8px!important; height:auto!important; }
      html.homepagescript-active .popular-container .history-tips { height:auto!important; white-space:normal!important; }
      html.homepagescript-active .weekly-header .date-info .panel { box-sizing:border-box!important; max-width:calc(100vw - 32px)!important; }
      html.homepagescript-active .rank-tab-wrap { overflow-x:auto!important; }
      html.homepagescript-active .rank-tab { display:flex!important; width:max-content!important; min-width:100%!important; }
      html.homepagescript-active .rank-tab > li { flex:none!important; }
      html.homepagescript-active .rank-tips { white-space:normal!important; height:auto!important; }
      html.homepagescript-active .rank-list { display:grid!important; grid-template-columns:repeat(var(--homepagescript-columns,2),minmax(0,1fr))!important; gap:16px 12px!important; }
      html.homepagescript-active .rank-item { box-sizing:border-box!important; width:100%!important; min-width:0!important; margin:0!important; }
      /* 行间距由网格统一提供，移除原生列表上下各 20px 的内边距。 */
      html.homepagescript-active .rank-item .content { display:flex!important; flex-direction:column!important; width:100%!important; min-width:0!important; padding:0!important; }
      html.homepagescript-active .rank-item :is(.img,.info,.detail,.detail-state) { box-sizing:border-box!important; width:100%!important; min-width:0!important; height:auto!important; margin:0!important; }
      html.homepagescript-active .rank-list:not(.pgc-list) .rank-item .img { aspect-ratio:16/9; }
      html.homepagescript-active .rank-item .img :is(a,img) { display:block; width:100%!important; }
      html.homepagescript-active .rank-list:not(.pgc-list) .rank-item .img :is(a,img) { height:100%!important; }
      /* 官方 pgc-list 使用竖封面；解除固定高度，沿用原生缩略图比例。 */
      html.homepagescript-active .rank-list.pgc-list .rank-item .img :is(a,img) { height:auto!important; }
      html.homepagescript-active .rank-item .info { padding:8px 0 0!important; }
      /* 原生标题固定预留三行，窄屏卡片按实际文字高度排列。 */
      html.homepagescript-active .rank-item .title { width:100%!important; height:auto!important; margin-bottom:8px!important; }
      html.homepagescript-active .rank-item .detail-state { display:flex!important; flex-wrap:wrap!important; gap:4px 10px!important; }
      /* 保留原生 DOM 和弹层事件，通过网格将上榜入口排在作者右侧，统计另起一行。 */
      html.homepagescript-active .rank-list:not(.pgc-list) .rank-item .content { display:grid!important; grid-template-columns:minmax(0,1fr) auto!important; column-gap:8px!important; }
      html.homepagescript-active .rank-list:not(.pgc-list) .rank-item :is(.info,.detail,.content > span:has(.more-data)) { display:contents!important; }
      html.homepagescript-active .rank-list:not(.pgc-list) .rank-item .img { grid-area:1 / 1 / 2 / -1; }
      html.homepagescript-active .rank-list:not(.pgc-list) .rank-item .title { grid-area:2 / 1 / 3 / -1; padding-top:8px!important; }
      html.homepagescript-active .rank-list:not(.pgc-list) .rank-item .detail > a { grid-area:3 / 1; min-width:0!important; align-self:center; }
      html.homepagescript-active .rank-list:not(.pgc-list) .rank-item .up-name { width:100%!important; max-width:100%!important; margin:0!important; }
      html.homepagescript-active .rank-list:not(.pgc-list) .rank-item .detail-state { grid-area:4 / 1 / 5 / -1; margin-top:4px!important; }
      html.homepagescript-active .rank-item .more-data { grid-area:3 / 2; position:static!important; display:inline-flex!important; align-items:center!important; align-self:center; max-width:100%!important; margin:0!important; white-space:nowrap!important; }
      html.homepagescript-active .van-popover.other { min-width:0!important; max-width:calc(100vw - 24px)!important; }
      html.homepagescript-active .van-popover.other .other-link { width:auto!important; max-width:100%!important; white-space:normal!important; overflow-wrap:anywhere!important; }
      /* 音乐榜使用 CSS Modules；按语义前缀匹配，避免绑定构建哈希。 */
      html.homepagescript-active .music-rank-list [class*="_cardList_"] { display:flex!important; flex-direction:column!important; gap:12px!important; width:100%!important; }
      html.homepagescript-active .music-rank-list :is([class*="_card_"],[class*="_cardContainer_"]) { box-sizing:border-box!important; width:100%!important; min-width:0!important; height:auto!important; margin:0!important; padding:12px!important; }
      html.homepagescript-active .music-rank-list [class*="_right_"] { flex:1!important; min-width:0!important; }
      html.homepagescript-active .music-rank-list [class*="_musicInfo_"] { position:relative!important; display:grid!important; grid-template-columns:80px minmax(0,1fr)!important; gap:8px!important; height:auto!important; min-height:80px!important; }
      html.homepagescript-active .music-rank-list [class*="_musicInfo_"] > svg { grid-area:1 / 1; width:80px!important; height:80px!important; }
      html.homepagescript-active .music-rank-list [class*="_musicInfo_"] > img { grid-area:1 / 1; position:relative!important; inset:auto!important; width:80px!important; height:80px!important; }
      html.homepagescript-active .music-rank-list [class*="_musicInfo_"] > [class*="_info_"] { grid-area:1 / 2; }
      html.homepagescript-active .music-rank-list [class*="_musicInfo_"] > [class*="_otherInfo_"] { grid-column:1 / -1; height:auto!important; }
      html.homepagescript-active .music-rank-list [class*="_heat_"] { margin:0!important; }
      html.homepagescript-active .music-rank-list :is([class*="_info_"],[class*="_top_"],[class*="_left_"],[class*="_subtitle_"],[class*="_upName_"]) { min-width:0!important; max-width:100%!important; height:auto!important; margin-left:0!important; }
      html.homepagescript-active .music-rank-list [class*="_vidoInfo_"] { flex-direction:column!important; gap:8px!important; height:auto!important; }
      html.homepagescript-active .music-rank-list [class*="_vidoInfo_"] > [class*="_cover_"] { width:100%!important; height:auto!important; aspect-ratio:16/9; }
      html.homepagescript-active .music-rank-list [class*="_coverImg_"] { width:100%!important; height:100%!important; object-fit:cover; }
      html.homepagescript-active .music-rank-list [class*="_cardContainer_"] { flex-direction:column!important; gap:12px!important; }
      html.homepagescript-active .music-rank-list [class*="_divider_"] { width:100%!important; height:1px!important; margin:0!important; }
      html.homepagescript-active .music-rank-list [class*="_videoList_"] { display:grid!important; grid-template-columns:repeat(auto-fit,minmax(140px,1fr))!important; gap:12px!important; width:100%!important; min-width:0!important; }
      html.homepagescript-active .music-rank-list [class*="_videoCard_"] { width:100%!important; min-width:0!important; margin:0!important; }
      html.homepagescript-active .music-rank-list [class*="_videoCover_"] { width:100%!important; height:auto!important; aspect-ratio:16/9; }
      html.homepagescript-active .music-rank-list [class*="_videoCover_"] > img { width:100%!important; height:100%!important; object-fit:cover; }
      html.homepagescript-active .music-rank-list [class*="_bottomTermSelect_"] { width:100%!important; min-width:0!important; margin-right:0!important; }
      html.homepagescript-active .music-rank-list [class*="_scrollContainer_"] { min-width:0!important; }
    }
  `;
  return css;
}
