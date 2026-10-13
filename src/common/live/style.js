import baseCss from './base.css';
import headerCss from './live-header.css';
import listCss from './live-list-layout.css';
import layoutCss from './home-layout.css';
import controlsCss from './home-controls.css';

// Preserve the former template's CSS order and trailing-whitespace handling.
export const liveStyle = [baseCss, headerCss, listCss, layoutCss, controlsCss]
  .map(css => css.trimEnd()).join('\n\n');

// Pages with their own content layout reuse only the live header and its popups.
export const liveHeaderStyle = [baseCss, headerCss, controlsCss]
  .map(css => css.trimEnd()).join('\n\n');
