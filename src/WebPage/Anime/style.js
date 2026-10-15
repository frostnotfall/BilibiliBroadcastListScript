import contentCss from './content.css';
import {homeStyle} from '../../common/main-site/home-style.js';
import cardHoverCss from '../../common/card-hover-layout.css';
// Numbered hot lists retain their native flex animation and card appearance.
export const pageStyle = homeStyle() + contentCss + cardHoverCss.replaceAll('.hot-ranking-cell-wrapper','.hot-ranking-cell-wrapper:not(.home-page-switch-wrapper.inner-content-wrapper .hot-ranking-cell-wrapper:has(.ranking-cell-index))');
