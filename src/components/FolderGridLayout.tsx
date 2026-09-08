import type { OdFolderChildren } from '../types'

import Link from 'next/link'
import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useClipboard } from 'use-clipboard-copy'

import { getBaseUrl } from '../utils/getBaseUrl'
import { formatModifiedDateTime } from '../utils/fileDetails'
import { Checkbox, ChildIcon, ChildName, Downloading } from './FileListing'
import { getStoredToken } from '../utils/protectedRouteHandler'

const GridItem = ({ c, path }: { c: OdFolderChildren; path: string }) => {
  // Folder covers are inferred from the first video/image inside the folder.
  const hashedToken = getStoredToken(path)
  const thumbnailUrl = c.folder
    ? `/api/folder-cover?path=${path}&size=large${hashedToken ? `&odpt=${hashedToken}` : ''}`
    : `/api/thumbnail?path=${path}&size=large${hashedToken ? `&odpt=${hashedToken}` : ''}`

  // Some thumbnails are broken, so we check for onerror event in the image component
  const [brokenThumbnail, setBrokenThumbnail] = useState(false)

  return (
    <div className="space-y-3">
      <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-gray-900/10 bg-gray-100 shadow-sm transition-all duration-300 ease-out group-hover:shadow-xl dark:border-gray-500/30 dark:bg-gray-800">
        {thumbnailUrl && !brokenThumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="h-full w-full transform-gpu object-cover object-top transition-transform duration-300 ease-out will-change-transform group-hover:scale-110"
            src={thumbnailUrl}
            alt={c.name}
            loading="lazy"
            decoding="async"
            onError={() => setBrokenThumbnail(true)}
          />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center rounded-2xl text-3xl text-gray-600 dark:text-gray-300">
            <ChildIcon child={c} />
            <span className="absolute bottom-2 right-2 rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-900/80 dark:text-gray-300">
              {c.folder?.childCount}
            </span>
          </div>
        )}
      </div>

      <div className="flex transform-gpu items-start justify-center space-x-2 px-1 text-center transition-transform duration-300 ease-out will-change-transform group-hover:scale-105">
        <span className="w-5 flex-shrink-0 text-center">
          <ChildIcon child={c} />
        </span>
        <span className="font-medium leading-5">
          <ChildName name={c.name} folder={Boolean(c.folder)} />
        </span>
      </div>
      <div className="truncate text-center font-mono text-xs text-gray-700 dark:text-gray-500">
        {formatModifiedDateTime(c.lastModifiedDateTime)}
      </div>
    </div>
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
    <div className="rounded bg-white shadow-sm dark:bg-gray-900 dark:text-gray-100">
      <div className="flex items-center border-b border-gray-900/10 px-3 text-xs font-bold uppercase tracking-widest text-gray-600 dark:border-gray-500/30 dark:text-gray-400">
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

      <div className="grid grid-cols-2 gap-5 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {folderChildren.map((c: OdFolderChildren) => (
          <div
            key={c.id}
            className="group relative overflow-hidden rounded-2xl p-2 transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-gray-100 dark:hover:bg-gray-850"
          >
            <div className="absolute right-0 top-0 z-10 m-1 rounded bg-white/50 py-0.5 opacity-0 transition-all duration-100 group-hover:opacity-100 dark:bg-gray-900/50">
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
                        }`
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
              } absolute left-0 top-0 z-10 m-1 rounded bg-white/50 py-0.5 group-hover:opacity-100 dark:bg-gray-900/50`}
            >
              {!c.folder && !(c.name === '.password') && (
                <Checkbox
                  checked={selected[c.id] ? 2 : 0}
                  onChange={() => toggleItemSelected(c.id)}
                  title={'选择文件'}
                />
              )}
            </div>

            <Link href={getItemPath(c.name)} passHref>
              <GridItem c={c} path={getItemPath(c.name)} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FolderGridLayout
