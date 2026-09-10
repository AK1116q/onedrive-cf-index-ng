import type { OdFolderChildren } from '../types'
import type { CSSProperties } from 'react'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { formatModifiedDateTime } from '../utils/fileDetails'
import { ChildIcon } from './FileListing'
import { getStoredToken } from '../utils/protectedRouteHandler'
import { coverPreviewLayout } from '../utils/coverPreviewLayout'
import CoverHoverPreview from './CoverHoverPreview'
import GeneratedCover from './GeneratedCover'
import { loadBangumiCover } from '../utils/bangumiCover'
import { shouldLoadFolderImage } from '../utils/folderCoverPolicy'
import { getEpisodeLabel } from '../utils/episodeLabel'

const BROKEN_IMAGE_CACHE_PREFIX = 'broken-cover-image:'
const PRIORITY_IMAGE_COUNT = 10

const canUseSessionStorage = () => typeof window !== 'undefined' && 'sessionStorage' in window

const readBrokenImageCache = (url?: string) => {
  if (!url || !canUseSessionStorage()) return false
  try {
    return window.sessionStorage.getItem(`${BROKEN_IMAGE_CACHE_PREFIX}${url}`) === '1'
  } catch {
    return false
  }
}

const writeBrokenImageCache = (url?: string) => {
  if (!url || !canUseSessionStorage()) return
  try {
    window.sessionStorage.setItem(`${BROKEN_IMAGE_CACHE_PREFIX}${url}`, '1')
  } catch {
    // Best-effort cache; failed storage should not affect rendering.
  }
}

const GridItem = ({
  c,
  path,
  parentPath,
  priorityImage,
}: {
  c: OdFolderChildren
  path: string
  parentPath: string
  priorityImage: boolean
}) => {
  const loadFolderImage = shouldLoadFolderImage(parentPath, Boolean(c.folder))
  const episodeLabel = c.file ? getEpisodeLabel(c.name) : null
  const hashedToken = getStoredToken(path)
  const params = new URLSearchParams({
    path: decodeURIComponent(path),
    size: 'large',
    rev: c.lastModifiedDateTime,
  })
  if (hashedToken) params.set('odpt', hashedToken)
  const thumbnailUrl = c.folder ? `/api/folder-cover?${params}` : `/api/thumbnail?${params}`

  // Some thumbnails are broken, so we check for onerror event in the image component
  const [brokenThumbnail, setBrokenThumbnail] = useState(false)
  const [loadedThumbnail, setLoadedThumbnail] = useState<string>()
  const [officialCover, setOfficialCover] = useState<string>()
  const [officialResolved, setOfficialResolved] = useState(!loadFolderImage)
  const [officialFailed, setOfficialFailed] = useState(false)
  const [coverLookupEnabled, setCoverLookupEnabled] = useState(!loadFolderImage)
  const anchor = useRef<HTMLAnchorElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [previewLayout, setPreviewLayout] = useState<ReturnType<typeof coverPreviewLayout> | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const imageUrl = c.folder
    ? loadFolderImage
      ? officialCover && !officialFailed
        ? officialCover
        : officialResolved
          ? thumbnailUrl
          : undefined
      : undefined
    : thumbnailUrl

  useEffect(() => {
    if (!loadFolderImage) {
      setCoverLookupEnabled(true)
      return
    }
    if (priorityImage || typeof IntersectionObserver === 'undefined') {
      setCoverLookupEnabled(true)
      return
    }
    setCoverLookupEnabled(false)
    const element = anchor.current
    if (!element) return
    const observer = new IntersectionObserver(
      entries => {
        if (!entries.some(entry => entry.isIntersecting)) return
        setCoverLookupEnabled(true)
        observer.disconnect()
      },
      { rootMargin: '720px 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [loadFolderImage, priorityImage])

  useEffect(() => {
    setOfficialCover(undefined)
    setOfficialFailed(false)
    if (!loadFolderImage) {
      setOfficialResolved(true)
      return
    }
    if (!coverLookupEnabled) {
      setOfficialResolved(false)
      return
    }
    let current = true
    setOfficialResolved(false)
    loadBangumiCover(c.name).then(result => {
      if (!current) return
      setOfficialCover(result.url ?? undefined)
      setOfficialResolved(true)
    })
    return () => {
      current = false
    }
  }, [c.name, coverLookupEnabled, loadFolderImage])

  useEffect(() => {
    setBrokenThumbnail(readBrokenImageCache(imageUrl))
    setLoadedThumbnail(undefined)
  }, [imageUrl])

  const closePreview = () => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setPreviewOpen(false)
      timer.current = setTimeout(() => setPreviewLayout(null), 170)
    }, 120)
  }
  const keepPreviewOpen = () => clearTimeout(timer.current)
  const dismissPreview = () => {
    clearTimeout(timer.current)
    setPreviewOpen(false)
    setPreviewLayout(null)
  }
  const openPreview = () => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (!anchor.current) return
      setPreviewLayout(
        coverPreviewLayout(
          { width: window.innerWidth, height: window.innerHeight },
          anchor.current.getBoundingClientRect(),
          Boolean(c.folder),
        ),
      )
      setPreviewOpen(true)
    }, 520)
  }

  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    if (!previewLayout) return
    const dismiss = () => dismissPreview()
    const dismissOnScroll = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('[data-cover-preview]')) return
      dismiss()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss()
    }
    window.addEventListener('scroll', dismissOnScroll, true)
    window.addEventListener('resize', dismiss)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', dismissOnScroll, true)
      window.removeEventListener('resize', dismiss)
      window.removeEventListener('keydown', onKey)
    }
  }, [previewLayout])

  return (
    <>
      <Link
        href={path}
        ref={anchor}
        className="block min-w-0 space-y-3 rounded-2xl focus-visible:outline-2 focus-visible:outline-sky-500"
        aria-label={c.name}
        onPointerEnter={openPreview}
        onPointerLeave={closePreview}
        onFocus={openPreview}
        onBlur={closePreview}
        onClick={dismissPreview}
      >
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-gray-900/10 bg-gray-100 shadow-sm transition-all duration-300 ease-out group-hover:shadow-xl dark:border-gray-500/30 dark:bg-gray-800">
          <GeneratedCover name={c.name} />
          {imageUrl && !brokenThumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={`${loadedThumbnail ? 'opacity-100' : 'opacity-0'} absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-300`}
              src={imageUrl}
              alt={c.name}
              title={imageUrl === officialCover ? '官方封面来源：Bangumi' : undefined}
              loading={priorityImage ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={priorityImage ? 'high' : 'auto'}
              onLoad={() => setLoadedThumbnail(imageUrl)}
              onError={() => {
                if (imageUrl === officialCover) {
                  setOfficialFailed(true)
                  return
                }
                writeBrokenImageCache(imageUrl)
                setBrokenThumbnail(true)
              }}
            />
          )}
          {c.folder && (
            <span className="absolute right-2 bottom-2 rounded-full bg-white/85 px-2 py-0.5 text-xs font-medium text-gray-700 shadow-sm dark:bg-gray-900/85 dark:text-gray-300">
              {c.folder.childCount}
            </span>
          )}
          {episodeLabel && (
            <span className="absolute bottom-2 left-2 z-[5] rounded-full border border-white/35 bg-pink-600/90 px-2.5 py-1 text-xs font-black tracking-wide text-white shadow-lg backdrop-blur-md">
              {episodeLabel}
            </span>
          )}
        </div>

        <div dir="ltr" className="flex min-w-0 items-start gap-2 px-1 text-left">
          <span className="w-5 flex-shrink-0 text-center">
            <ChildIcon child={c} />
          </span>
          <span data-cover-title className="block min-w-0 flex-1 truncate leading-5 font-medium">
            {c.name}
          </span>
        </div>
        <div className="truncate text-center font-mono text-xs text-gray-700 dark:text-gray-500">
          {formatModifiedDateTime(c.lastModifiedDateTime)}
        </div>
      </Link>
      {previewLayout && (
        <CoverHoverPreview
          name={c.name}
          image={brokenThumbnail ? undefined : loadedThumbnail}
          layout={previewLayout}
          open={previewOpen}
          folder={Boolean(c.folder)}
          path={path}
          revision={c.lastModifiedDateTime}
          href={path}
          onPointerEnter={keepPreviewOpen}
          onPointerLeave={closePreview}
        />
      )}
    </>
  )
}

const FolderGridLayout = ({ path, folderChildren }: { path: string; folderChildren: OdFolderChildren[] }) => {
  // Get item path from item name
  const getItemPath = (name: string) => `${path === '/' ? '' : path}/${encodeURIComponent(name)}`

  return (
    <div className="archive-panel rounded-3xl shadow-sm dark:text-gray-100">
      <div className="flex items-center border-b border-gray-900/10 px-3 text-xs font-bold tracking-widest text-gray-600 uppercase dark:border-gray-500/30 dark:text-gray-400">
        <div className="py-3">{`${folderChildren.length} 个项目`}</div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] sm:gap-4 sm:p-4">
        {folderChildren.map((c: OdFolderChildren, index: number) => (
          <div
            key={c.id}
            style={
              {
                '--archive-card-delay': `${Math.min(index, 12) * 34}ms`,
              } as CSSProperties & Record<'--archive-card-delay', string>
            }
            className="archive-card group relative min-w-0 rounded-2xl p-2 transition-colors duration-200"
          >
            <GridItem
              key={getItemPath(c.name)}
              c={c}
              path={getItemPath(c.name)}
              parentPath={path}
              priorityImage={index < PRIORITY_IMAGE_COUNT}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default FolderGridLayout
