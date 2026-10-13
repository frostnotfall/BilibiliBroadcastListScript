// 坐标与宽度均为缩放后的视口尺寸；主卡片仍由各页面定位。
export function avatarSubmenuPosition(anchor, width, viewportWidth) {
  const edge = viewportWidth - 8;
  const right = Math.max(8, Math.min(anchor.right, edge - width));
  // 右侧放不下整张菜单时只回移必要距离，利用剩余空间，
  // 并留出触发行的一部分，保持原生悬停入口可达。
  const opensRight = anchor.right + width <= edge
    || edge > anchor.right && right > anchor.left;
  const leftFits = anchor.left - width >= 8;
  const left = opensRight ? right
    : leftFits ? anchor.left - width : anchor.right - width;
  return {left:Math.max(8, Math.min(left, edge - width)), opensLeft:!opensRight};
}
