import type { OdFileObject } from '../../types'

import { FC } from 'react'

import { humanFileSize } from '../../utils/fileDetails'
import { getExtension } from '../../utils/getFileIcon'

const largeVideoThreshold = 800 * 1024 * 1024

const codecHints = ['hevc', 'h265', 'h.265', '10bit', '10-bit', 'hi10p']

const VideoPlaybackNotice: FC<{ file: OdFileObject }> = ({ file }) => {
  const extension = getExtension(file.name)
  const lowerName = file.name.toLowerCase()
  const warnings: string[] = []

  if (['mkv', 'flv', 'ts'].includes(extension)) {
    warnings.push(`${extension.toUpperCase()} 在不同浏览器里的兼容性不稳定。`)
  }

  if (codecHints.some(codec => lowerName.includes(codec))) {
    warnings.push('HEVC/H.265 或 10-bit 视频可能在浏览器里只有声音、黑屏，或者明显卡顿。')
  }

  if (file.size >= largeVideoThreshold) {
    warnings.push(`这个文件大小为 ${humanFileSize(file.size)}，网络较慢时云端播放可能会卡。`)
  }

  if (warnings.length === 0) return null

  return (
    <div className="mx-auto mt-3 max-w-3xl rounded-lg border border-amber-400/30 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="mb-1 font-semibold">播放建议</div>
      <div>
        {warnings.join(' ')} 为了获得更稳定的播放体验，建议使用 PotPlayer 打开，或先下载后观看。
      </div>
    </div>
  )
}

export default VideoPlaybackNotice
