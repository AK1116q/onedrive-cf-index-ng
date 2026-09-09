import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import styles from './CoverHoverPreview.module.css'
import GeneratedCover from './GeneratedCover'
import type { coverPreviewLayout } from '../utils/coverPreviewLayout'
import type { FolderTreeNode } from '../utils/folderTree'
import { countFolderTree } from '../utils/folderTree'
import { loadFolderTree } from '../utils/loadFolderTree'
import { getFileIcon } from '../utils/getFileIcon'

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
  onPointerEnter: () => void
  onPointerLeave: () => void
}) {
  const [entered, setEntered] = useState(false)
  const [tree, setTree] = useState<FolderTreeNode[]>()
  const [treeError, setTreeError] = useState('')

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
    setTreeError('')
    loadFolderTree(path, revision)
      .then(value => current && setTree(value))
      .catch(error => current && setTreeError(error instanceof Error ? error.message : '目录读取失败。'))
    return () => {
      current = false
    }
  }, [folder, open, path, revision])

  const counts = tree ? countFolderTree(tree) : null

  return createPortal(
    <div
      aria-hidden="true"
      data-cover-preview
      data-open={entered && open}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      style={{ width: layout.width, left: layout.left, top: layout.top } as CSSProperties}
      className={`${styles.preview} rounded-2xl border border-white/20 bg-white p-3 text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-gray-100`}
    >
      <div className="flex items-stretch gap-3">
        <div style={{ width: layout.imageSize }} className="shrink-0">
          <div
            data-cover-preview-image
            style={{ width: layout.imageSize, height: layout.imageSize }}
            className="overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800"
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
                {counts ? `${counts.files} 个文件 · ${counts.folders} 个子文件夹` : '正在读取全部文件...'}
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
