export function coverPreviewLayout(
  viewport: { width: number; height: number },
  anchor: { left: number; top: number; width: number; height: number },
) {
  const margin = 16
  const topMargin = 64
  const height = Math.min(Math.sqrt((viewport.width * viewport.height * 0.2) / 0.7), viewport.height - topMargin - margin)
  const width = Math.min(height * 0.7, viewport.width - margin * 2)
  return {
    width,
    height,
    left: Math.max(margin, Math.min(anchor.left + anchor.width / 2 - width / 2, viewport.width - width - margin)),
    top: Math.max(topMargin, Math.min(anchor.top + anchor.height / 2 - height / 2, viewport.height - height - margin)),
  }
}
