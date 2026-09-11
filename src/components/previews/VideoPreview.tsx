import type { OdFileObject } from '../../types'

import { FC, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'

import axios from 'axios'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'
import { useAsync } from 'react-async-hook'
import { useClipboard } from 'use-clipboard-copy'

import { getBaseUrl } from '../../utils/getBaseUrl'
import { getExtension } from '../../utils/getFileIcon'
import { getStoredToken } from '../../utils/protectedRouteHandler'
import { getSubtitleCandidates, subtitleTextToVtt } from '../../utils/subtitleTracks'

import { DownloadButton } from '../DownloadBtnGtoup'
import { DownloadBtnContainer, PreviewContainer } from './Containers'
import FourOhFour from '../FourOhFour'
import Loading from '../Loading'
import VideoPlaybackNotice from './VideoPlaybackNotice'

import 'plyr-react/plyr.css'

// Dynamic import to avoid ESM issues in Cloudflare
const Plyr = dynamic(() => import('plyr-react').then(mod => mod.Plyr), {
  ssr: false,
  loading: () => <Loading loadingText="正在加载播放器..." />,
})

const VideoPlayer: FC<{
  videoName: string
  videoUrl: string
  width?: number
  height?: number
  thumbnail: string
  subtitles: ReturnType<typeof getSubtitleCandidates>
  hashedToken?: string
  isFlv: boolean
  mpegts: any
}> = ({ videoName, videoUrl, width, height, thumbnail, subtitles, hashedToken, isFlv, mpegts }) => {
  const [subtitleStatus, setSubtitleStatus] = useState<'searching' | 'loaded' | 'missing'>('searching')

  useEffect(() => {
    let currentSubtitleUrl = ''
    let cancelled = false
    const wait = (duration: number) => new Promise(resolve => window.setTimeout(resolve, duration))
    const findTrack = async () => {
      for (let attempt = 0; attempt < 10; attempt++) {
        const track = document.querySelector('track')
        if (track) return track
        await wait(120)
      }
      return null
    }

    const loadSubtitle = async () => {
      setSubtitleStatus('searching')
      const track = await findTrack()
      if (!track) {
        if (!cancelled) setSubtitleStatus('missing')
        return
      }

      for (const subtitle of subtitles) {
        const url = `/api/raw?path=${subtitle.path}${hashedToken ? `&odpt=${hashedToken}` : ''}`
        try {
          const response = await axios.get(url, { responseType: 'text' })
          const vttText = subtitleTextToVtt(response.data, subtitle.format)
          if (cancelled) return
          if (!vttText.trim()) continue
          currentSubtitleUrl = URL.createObjectURL(new Blob([vttText], { type: 'text/vtt;charset=utf-8' }))
          track.setAttribute('src', currentSubtitleUrl)
          track.setAttribute('label', subtitle.format.toUpperCase())
          setSubtitleStatus('loaded')
          return
        } catch {
          // Try the next supported subtitle extension beside the video.
        }
      }
      if (!cancelled) setSubtitleStatus('missing')
    }

    void loadSubtitle()

    if (isFlv) {
      const loadFlv = () => {
        // Really hacky way to get the exposed video element from Plyr
        const video = document.getElementById('plyr')
        const flv = mpegts.createPlayer({ url: videoUrl, type: 'flv' })
        flv.attachMediaElement(video)
        flv.load()
      }
      loadFlv()
    }
    return () => {
      cancelled = true
      if (currentSubtitleUrl) URL.revokeObjectURL(currentSubtitleUrl)
    }
  }, [videoUrl, isFlv, mpegts, subtitles, hashedToken])

  // Common plyr configs, including the video source and plyr options
  const plyrSource = {
    type: 'video',
    title: videoName,
    poster: thumbnail,
    tracks: [{ kind: 'captions', label: '字幕', src: '', srclang: 'zh', default: true }],
  }
  const plyrOptions = {
    ratio: `${width ?? 16}:${height ?? 9}`,
    fullscreen: { iosNative: true },
  }
  if (!isFlv) {
    // If the video is not in flv format, we can use the native plyr and add sources directly with the video URL
    plyrSource['sources'] = [{ src: videoUrl }]
  }
  return (
    <>
      <Plyr id="plyr" source={plyrSource as any} options={plyrOptions as any} />
      <div className="archive-video-subtitle-status mt-3 rounded-2xl px-4 py-3 text-sm">
        {subtitleStatus === 'loaded'
          ? '已加载同名外挂字幕。'
          : subtitleStatus === 'searching'
            ? '正在查找同名外挂字幕...'
            : '未找到同名外挂字幕。浏览器通常无法读取 MKV 内嵌字幕，可在视频旁放置同名 .srt、.ass 或 .vtt 文件。'}
      </div>
    </>
  )
}

const VideoPreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const { asPath } = useRouter()
  const hashedToken = getStoredToken(asPath)
  const clipboard = useClipboard()

  // OneDrive generates thumbnails for its video files, we pick the thumbnail with the highest resolution
  const thumbnail = `/api/thumbnail?path=${asPath}&size=large${hashedToken ? `&odpt=${hashedToken}` : ''}`

  // Browser video cannot read subtitle tracks embedded in MKV files, so we look for supported sidecar subtitles.
  const subtitles = useMemo(() => getSubtitleCandidates(asPath), [asPath])

  // We also format the raw video file for the in-browser player as well as all other players
  const videoUrl = `/api/raw?path=${asPath}${hashedToken ? `&odpt=${hashedToken}` : ''}`

  const isFlv = getExtension(file.name) === 'flv'
  const {
    loading,
    error,
    result: mpegts,
  } = useAsync(async () => {
    if (isFlv) {
      return (await import('mpegts.js')).default
    }
  }, [isFlv])

  return (
    <>
      <PreviewContainer>
        {error ? (
          <FourOhFour errorMsg={error.message} />
        ) : loading && isFlv ? (
          <Loading loadingText={'正在加载 FLV 播放组件...'} />
        ) : (
          <VideoPlayer
            videoName={file.name}
            videoUrl={videoUrl}
            width={file.video?.width}
            height={file.video?.height}
            thumbnail={thumbnail}
            subtitles={subtitles}
            hashedToken={hashedToken ?? undefined}
            isFlv={isFlv}
            mpegts={mpegts}
          />
        )}
        <VideoPlaybackNotice file={file} />
      </PreviewContainer>

      <DownloadBtnContainer>
        <div className="flex flex-wrap justify-center gap-2">
          <DownloadButton
            onClickCallback={() => window.open(videoUrl)}
            btnColor="blue"
            btnText={'下载'}
            btnIcon="file-download"
          />
          <DownloadButton
            onClickCallback={() => {
              clipboard.copy(`${getBaseUrl()}/api/raw?path=${asPath}${hashedToken ? `&odpt=${hashedToken}` : ''}`)
              toast.success('直链已复制到剪贴板。')
            }}
            btnColor="pink"
            btnText={'复制直链'}
            btnIcon="copy"
          />
          <DownloadButton
            onClickCallback={() => window.open(`potplayer://${getBaseUrl()}${videoUrl}`)}
            btnText="PotPlayer 打开"
            btnImage="/players/potplayer.png"
          />
        </div>
      </DownloadBtnContainer>
    </>
  )
}

export default VideoPreview
