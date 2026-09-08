import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'

import styles from './CoverHoverPreview.module.css'
import GeneratedCover from './GeneratedCover'
import type { coverPreviewLayout } from '../utils/coverPreviewLayout'

export default function CoverHoverPreview({
  name,
  image,
  layout,
  open,
}: {
  name: string
  image?: string
  layout: ReturnType<typeof coverPreviewLayout>
  open: boolean
}) {
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setEntered(true))
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [])

  return createPortal(
    <div
      aria-hidden="true"
      data-cover-preview
      data-open={entered && open}
      style={{ width: layout.width, left: layout.left, top: layout.top } as CSSProperties}
      className={`${styles.preview} rounded-2xl border border-white/20 bg-white p-3 text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-gray-100`}
    >
      <div
        data-cover-preview-image
        style={{ width: layout.imageSize, height: layout.imageSize }}
        className="shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <GeneratedCover name={name} />
        )}
      </div>
      <div
        dir="ltr"
        title={name}
        className="max-h-28 shrink-0 overflow-hidden px-2 pt-4 pb-2 text-left text-lg leading-relaxed font-semibold [overflow-wrap:anywhere]"
      >
        {name}
      </div>
    </div>,
    document.body,
  )
}
