import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'

import styles from './CoverHoverPreview.module.css'

export default function CoverHoverPreview({
  name,
  image,
  layout,
  open,
}: {
  name: string
  image?: string
  layout: CSSProperties
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
      style={layout}
      className={`${styles.preview} rounded-2xl border border-white/20 bg-white p-3 text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-gray-100`}
    >
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" decoding="async" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-700 to-indigo-950 p-8 text-center text-4xl text-white">
            {name.slice(0, 2)}
          </div>
        )}
      </div>
      <div
        dir="ltr"
        className="shrink-0 px-2 pt-4 pb-2 text-left text-lg leading-relaxed font-semibold [overflow-wrap:anywhere]"
      >
        {name}
      </div>
    </div>,
    document.body,
  )
}
