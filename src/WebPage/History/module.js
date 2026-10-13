import {pageId, isPageUrl, isMediaUrl, createPageOpening} from '../../common/index.js';
import {mountHomeLayout} from '../../common/main-site/home-layout.js';
import {pageStyle} from './style.js';
export const early = () => createPageOpening();
export const mount = () => mountHomeLayout(pageStyle, () => pageId(location.href) === 'History');
