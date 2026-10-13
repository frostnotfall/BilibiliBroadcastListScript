import {createPageOpening} from '../../common/index.js';
import {mountLivePage} from '../../common/live/runtime.js';
import {pageStyle} from './style.js';
export const early = () => createPageOpening({
  // The native follow div lives inside the room anchor and stops bubbling.
  // Let that handler run before the document capture bridge claims the link.
  ignoreClick:event => event.composedPath().some(node => node.matches?.('#room-card-list [class*="Item_follow-btn_"]')),
});
// The native area grid responds to its own available width in CSS.
export const mount = () => mountLivePage({id:'LiveArea', extraStyle:pageStyle, contentSelector:null});
