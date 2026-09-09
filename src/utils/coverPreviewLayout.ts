export function coverPreviewLayout(
  viewport: { width: number; height: number },
  anchor: { left: number; top: number; width: number; height: number },
  withFileList = false,
) {
  const margin = 16
  const topMargin = 64
  const padding = 24
  const border = 2
  const gap = withFileList ? 12 : 0
  const titleSpace = 136
  const availableWidth = viewport.width - margin * 2
  const minimumPanelWidth = withFileList ? 180 : 0
  const imageSize = Math.min(
    Math.sqrt(viewport.width * viewport.height * 0.2),
    availableWidth - padding - border - gap - minimumPanelWidth,
    viewport.height - topMargin - margin - padding - titleSpace,
  )
  const panelWidth = withFileList
    ? Math.min(Math.max(imageSize * 0.72, 260), 460, availableWidth - imageSize - padding - border - gap)
    : 0
  const width = imageSize + panelWidth + gap + padding + border
  const estimatedHeight = imageSize + padding + border + titleSpace
  return {
    imageSize,
    panelWidth,
    contentHeight: imageSize + titleSpace,
    width,
    left: Math.max(margin, Math.min(anchor.left + anchor.width / 2 - width / 2, viewport.width - width - margin)),
    top: Math.max(
      topMargin,
      Math.min(anchor.top + anchor.height / 2 - estimatedHeight / 2, viewport.height - estimatedHeight - margin),
    ),
  }
}
