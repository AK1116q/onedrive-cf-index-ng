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
    warnings.push(`${extension.toUpperCase()} is not consistently supported by every browser player.`)
  }

  if (codecHints.some(codec => lowerName.includes(codec))) {
    warnings.push('HEVC/H.265 or 10-bit video may play with audio only, a black screen, or heavy stutter in browsers.')
  }

  if (file.size >= largeVideoThreshold) {
    warnings.push(`This file is ${humanFileSize(file.size)}, so cloud streaming may stutter on slower networks.`)
  }

  if (warnings.length === 0) return null

  return (
    <div className="mx-auto mt-3 max-w-3xl rounded-lg border border-amber-400/30 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="mb-1 font-semibold">Playback tip</div>
      <div>
        {warnings.join(' ')} For the smoothest playback, open it in PotPlayer or download the file before watching.
      </div>
    </div>
  )
}

export default VideoPlaybackNotice
