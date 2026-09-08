export function coverPreviewLayout(
  viewport: { width: number; height: number },
  anchor: { left: number; top: number; width: number; height: number },
) {
  const margin = 16
  const topMargin = 64
  const padding = 24
  const border = 2
  const titleSpace = 136
  const imageSize = Math.min(
    Math.sqrt(viewport.width * viewport.height * 0.2),
    viewport.width - margin * 2 - padding - border,
    viewport.height - topMargin - margin - padding - titleSpace,
  )
  const width = imageSize + padding + border
  const estimatedHeight = imageSize + padding + border + titleSpace
  return {
    imageSize,
    width,
    left: Math.max(margin, Math.min(anchor.left + anchor.width / 2 - width / 2, viewport.width - width - margin)),
    top: Math.max(
      topMargin,
      Math.min(anchor.top + anchor.height / 2 - estimatedHeight / 2, viewport.height - estimatedHeight - margin),
    ),
  }
}
