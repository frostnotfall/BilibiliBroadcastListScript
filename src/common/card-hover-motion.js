// Measure the animated width, rather than jumping to the final expanded size.
// Music and native PGC rows share the same edge constraint.
export function expandedRowOffset({rowWidth, cardWidth, expandedWidth, index, gap = 0, priorExpansion = 0, center = false}) {
  const left = index * (cardWidth + gap) + priorExpansion;
  const overflow = left + expandedWidth - rowWidth;
  const preferred = center && index > 0 ? (expandedWidth - cardWidth) / 2 : 0;
  return -Math.max(0, Math.min(left, Math.max(overflow, preferred)));
}
