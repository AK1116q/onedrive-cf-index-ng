import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Link from 'next/link'

import styles from './CoverHoverPreview.module.css'
import GeneratedCover from './GeneratedCover'
import type { coverPreviewLayout } from '../utils/coverPreviewLayout'
import type { FolderTreeNode } from '../utils/folderTree'
import { countFolderTree } from '../utils/folderTree'
import { loadFolderTree, stopWatchingFolderTree } from '../utils/loadFolderTree'
import { getFileIcon } from '../utils/getFileIcon'

const TREE_LOAD_DELAY_MS = 280

const TreeRows = ({ nodes }: { nodes: FolderTreeNode[] }) => (
  <ul className="space-y-0.5">
    {nodes.map(node => (
      <li key={node.id}>
        <div
          data-tree-row
          title={node.name}
          className={`flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
            node.isFolder ? 'bg-gray-100 font-semibold dark:bg-gray-800' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <FontAwesomeIcon
            className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400"
            icon={node.isFolder ? ['far', 'folder'] : getFileIcon(node.name)}
          />
          <span className="min-w-0 truncate">{node.name}</span>
        </div>
        {node.children.length > 0 && (
          <div className="ml-3 border-l border-gray-300 pl-2 dark:border-gray-700">
            <TreeRows nodes={node.children} />
          </div>
        )}
        {node.error && <div className="ml-5 px-2 py-1 text-xs text-red-500">{node.error}</div>}
      </li>
    ))}
  </ul>
)

export default function CoverHoverPreview({
  name,
  image,
  layout,
  open,
  folder,
  path,
  revision,
  href,
  onPointerEnter,
  onPointerLeave,
}: {
  name: string
  image?: string
  layout: ReturnType<typeof coverPreviewLayout>
  open: boolean
  folder: boolean
  path: string
  revision: string
  href: string
  onPointerEnter: () => void
  onPointerLeave: () => void
}) {
  const [entered, setEntered] = useState(false)
  const [tree, setTree] = useState<FolderTreeNode[]>()
  const [treeError, setTreeError] = useState('')
  const [treeComplete, setTreeComplete] = useState(false)

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

  useEffect(() => {
    if (!folder || !open) return
    let current = true
    let started = false
    const updateTree = (value: FolderTreeNode[]) => current && setTree([...value])
    const timer = setTimeout(() => {
      if (!current) return
      started = true
      loadFolderTree(path, revision, updateTree)
        .then(value => {
          if (!current) return
          setTree(value)
          setTreeComplete(true)
        })
        .catch(error => current && setTreeError(error instanceof Error ? error.message : '目录读取失败。'))
    }, TREE_LOAD_DELAY_MS)
    setTree(undefined)
    setTreeError('')
    setTreeComplete(false)
    return () => {
      current = false
      clearTimeout(timer)
      if (started) stopWatchingFolderTree(path, revision, updateTree)
    }
  }, [folder, open, path, revision])

  const counts = tree ? countFolderTree(tree) : null

  return createPortal(
    <div
      aria-label={`${name} 预览`}
      data-cover-preview
      data-open={entered && open}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      style={{ width: layout.width, left: layout.left, top: layout.top } as CSSProperties}
      className={`${styles.preview} rounded-2xl border border-white/20 bg-white p-3 text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-gray-100`}
    >
      <div className="flex items-stretch gap-3">
        <div style={{ width: layout.imageSize }} className="shrink-0">
          <Link
            href={href}
            aria-label={`打开 ${name}`}
            title={`打开 ${name}`}
            data-cover-preview-image
            style={{ width: layout.imageSize, height: layout.imageSize }}
            className="group/preview-image relative block overflow-hidden rounded-xl bg-gray-100 ring-sky-400 transition-shadow outline-none hover:ring-2 focus-visible:ring-2 dark:bg-gray-800"
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" decoding="async" className="h-full w-full object-cover" />
            ) : (
              <GeneratedCover name={name} />
            )}
            <span className="absolute inset-x-0 bottom-0 translate-y-full bg-gray-950/75 px-3 py-2 text-center text-xs font-semibold text-white backdrop-blur-sm transition-transform group-hover/preview-image:translate-y-0 group-focus-visible/preview-image:translate-y-0">
              点击打开文件夹
            </span>
          </Link>
          <div
            dir="ltr"
            title={name}
            className="max-h-28 overflow-hidden px-2 pt-4 pb-2 text-left text-lg leading-relaxed font-semibold [overflow-wrap:anywhere]"
          >
            {name}
          </div>
        </div>
        {folder && (
          <section
            data-cover-file-list
            style={{ width: layout.panelWidth, height: layout.contentHeight }}
            className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-950"
          >
            <div className="shrink-0 border-b border-gray-200 px-3 py-2.5 dark:border-gray-700">
              <div className="text-sm font-semibold">目录内容</div>
              <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {counts
                  ? `${counts.files} 个文件 · ${counts.folders} 个子文件夹${treeComplete ? '' : ' · 正在补全'}`
                  : '正在读取目录...'}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {treeError ? (
                <div className="p-3 text-sm text-red-500">{treeError}</div>
              ) : tree ? (
                tree.length > 0 ? (
                  <TreeRows nodes={tree} />
                ) : (
                  <div className="p-3 text-sm text-gray-500">空文件夹</div>
                )
              ) : (
                <div className="space-y-2 p-2" aria-label="正在读取目录">
                  {Array.from({ length: 8 }, (_, index) => (
                    <div key={index} className="h-7 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>,
    document.body,
  )
}
