import {pageId, isPageUrl, isMediaUrl, createPageOpening} from '../../common/index.js';
import {resolveLiveHomeLink} from '../../common/live/link-target.js';
export {mount} from '../../common/live/runtime.js';
export const early = () => createPageOpening({resolveLink:resolveLiveHomeLink});
