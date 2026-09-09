import type { OdFolderChildren } from '../types'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useClipboard } from 'use-clipboard-copy'

import { getBaseUrl } from '../utils/getBaseUrl'
import { formatModifiedDateTime } from '../utils/fileDetails'
import { Checkbox, ChildIcon, Downloading } from './FileListing'
import { getStoredToken } from '../utils/protectedRouteHandler'
import { coverPreviewLayout } from '../utils/coverPreviewLayout'
import CoverHoverPreview from './CoverHoverPreview'
import GeneratedCover from './GeneratedCover'
import { prefetchFolderTree } from '../utils/loadFolderTree'
import { loadBangumiCover } from '../utils/bangumiCover'

const GridItem = ({ c, path }: { c: OdFolderChildren; path: string }) => {
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
  const [officialResolved, setOfficialResolved] = useState(!c.folder)
  const [officialFailed, setOfficialFailed] = useState(false)
  const anchor = useRef<HTMLAnchorElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [previewLayout, setPreviewLayout] = useState<ReturnType<typeof coverPreviewLayout> | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const imageUrl = c.folder
    ? officialCover && !officialFailed
      ? officialCover
      : officialResolved
        ? thumbnailUrl
        : undefined
    : thumbnailUrl

  useEffect(() => {
    if (!c.folder) return
    let current = true
    setOfficialCover(undefined)
    setOfficialResolved(false)
    setOfficialFailed(false)
    loadBangumiCover(c.name).then(result => {
      if (!current) return
      setOfficialCover(result.url ?? undefined)
      setOfficialResolved(true)
    })
    return () => {
      current = false
    }
  }, [c.folder, c.name])

  useEffect(() => {
    setBrokenThumbnail(false)
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
      if (c.folder) prefetchFolderTree(path, c.lastModifiedDateTime)
      setPreviewLayout(
        coverPreviewLayout(
          { width: window.innerWidth, height: window.innerHeight },
          anchor.current.getBoundingClientRect(),
          Boolean(c.folder),
        ),
      )
      setPreviewOpen(true)
    }, 650)
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
              loading="lazy"
              decoding="async"
              onLoad={() => setLoadedThumbnail(imageUrl)}
              onError={() => {
                if (imageUrl === officialCover) {
                  setOfficialFailed(true)
                  return
                }
                setBrokenThumbnail(true)
              }}
            />
          )}
          {c.folder && (
            <span className="absolute right-2 bottom-2 rounded-full bg-white/85 px-2 py-0.5 text-xs font-medium text-gray-700 shadow-sm dark:bg-gray-900/85 dark:text-gray-300">
              {c.folder.childCount}
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

const FolderGridLayout = ({
  path,
  folderChildren,
  selected,
  toggleItemSelected,
  totalSelected,
  toggleTotalSelected,
  totalGenerating,
  handleSelectedDownload,
  folderGenerating,
  handleSelectedPermalink,
  handleFolderDownload,
  toast,
}) => {
  const clipboard = useClipboard()
  const hashedToken = getStoredToken(path)

  // Get item path from item name
  const getItemPath = (name: string) => `${path === '/' ? '' : path}/${encodeURIComponent(name)}`

  return (
    <div className="archive-panel rounded-3xl shadow-sm dark:text-gray-100">
      <div className="flex items-center border-b border-gray-900/10 px-3 text-xs font-bold tracking-widest text-gray-600 uppercase dark:border-gray-500/30 dark:text-gray-400">
        <div className="flex-1">{`${folderChildren.length} 个项目`}</div>
        <div className="flex p-1.5 text-gray-700 dark:text-gray-400">
          <Checkbox
            checked={totalSelected}
            onChange={toggleTotalSelected}
            indeterminate={true}
            title={'选择全部文件'}
          />
          <button
            title={'复制选中文件直链'}
            className="cursor-pointer rounded p-1.5 hover:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-white dark:hover:bg-gray-600 disabled:dark:text-gray-600 disabled:hover:dark:bg-gray-900"
            disabled={totalSelected === 0}
            onClick={() => {
              clipboard.copy(handleSelectedPermalink(getBaseUrl()))
              toast.success('已复制选中文件直链。')
            }}
          >
            <FontAwesomeIcon icon={['far', 'copy']} size="lg" />
          </button>
          {totalGenerating ? (
            <Downloading title={'正在下载选中文件，刷新页面可取消'} style="p-1.5" />
          ) : (
            <button
              title={'下载选中文件'}
              className="cursor-pointer rounded p-1.5 hover:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-white dark:hover:bg-gray-600 disabled:dark:text-gray-600 disabled:hover:dark:bg-gray-900"
              disabled={totalSelected === 0}
              onClick={handleSelectedDownload}
            >
              <FontAwesomeIcon icon={['far', 'arrow-alt-circle-down']} size="lg" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] sm:gap-4 sm:p-4">
        {folderChildren.map((c: OdFolderChildren) => (
          <div
            key={c.id}
            className="group dark:hover:bg-gray-850 relative min-w-0 rounded-2xl p-2 transition-colors duration-200 hover:bg-gray-100"
          >
            <div className="absolute top-0 right-0 z-10 m-1 rounded bg-white/50 py-0.5 opacity-0 transition-all duration-100 group-hover:opacity-100 dark:bg-gray-900/50">
              {c.folder ? (
                <div>
                  <span
                    title={'复制文件夹链接'}
                    className="cursor-pointer rounded px-1.5 py-1 hover:bg-gray-300 dark:hover:bg-gray-600"
                    onClick={() => {
                      clipboard.copy(`${getBaseUrl()}${getItemPath(c.name)}`)
                      toast.success('已复制文件夹链接。')
                    }}
                  >
                    <FontAwesomeIcon icon={['far', 'copy']} />
                  </span>
                  {folderGenerating[c.id] ? (
                    <Downloading title={'正在下载文件夹，刷新页面可取消'} style="px-1.5 py-1" />
                  ) : (
                    <span
                      title={'下载文件夹'}
                      className="cursor-pointer rounded px-1.5 py-1 hover:bg-gray-300 dark:hover:bg-gray-600"
                      onClick={handleFolderDownload(getItemPath(c.name), c.id, c.name)}
                    >
                      <FontAwesomeIcon icon={['far', 'arrow-alt-circle-down']} />
                    </span>
                  )}
                </div>
              ) : (
                <div>
                  <span
                    title={'复制文件直链'}
                    className="cursor-pointer rounded px-1.5 py-1 hover:bg-gray-300 dark:hover:bg-gray-600"
                    onClick={() => {
                      clipboard.copy(
                        `${getBaseUrl()}/api/raw?path=${getItemPath(c.name)}${
                          hashedToken ? `&odpt=${hashedToken}` : ''
                        }`,
                      )
                      toast.success('已复制文件直链。')
                    }}
                  >
                    <FontAwesomeIcon icon={['far', 'copy']} />
                  </span>
                  <a
                    title={'下载文件'}
                    className="cursor-pointer rounded px-1.5 py-1 hover:bg-gray-300 dark:hover:bg-gray-600"
                    href={`${getBaseUrl()}/api/raw?path=${getItemPath(c.name)}${
                      hashedToken ? `&odpt=${hashedToken}` : ''
                    }`}
                  >
                    <FontAwesomeIcon icon={['far', 'arrow-alt-circle-down']} />
                  </a>
                </div>
              )}
            </div>

            <div
              className={`${
                selected[c.id] ? 'opacity-100' : 'opacity-0'
              } absolute top-0 left-0 z-10 m-1 rounded bg-white/50 py-0.5 group-hover:opacity-100 dark:bg-gray-900/50`}
            >
              {!c.folder && !(c.name === '.password') && (
                <Checkbox
                  checked={selected[c.id] ? 2 : 0}
                  onChange={() => toggleItemSelected(c.id)}
                  title={'选择文件'}
                />
              )}
            </div>

            <GridItem key={getItemPath(c.name)} c={c} path={getItemPath(c.name)} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default FolderGridLayout
