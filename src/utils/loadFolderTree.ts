import { buildFolderTree } from './folderTree'
import { getStoredToken } from './protectedRouteHandler'

type TreeListener = (nodes: FolderTreeNode[]) => void
type TreeCacheEntry = {
  promise: Promise<FolderTreeNode[]>
  value?: FolderTreeNode[]
  listeners: Set<TreeListener>
}

import type { FolderTreeNode } from './folderTree'

const treeCache = new Map<string, TreeCacheEntry>()
const waiting: Array<() => void> = []
let activeRequests = 0

const withRequestSlot = async <T>(request: () => Promise<T>) => {
  if (activeRequests >= 4) await new Promise<void>(resolve => waiting.push(resolve))
  activeRequests++
  try {
    return await request()
  } finally {
    activeRequests--
    waiting.shift()?.()
  }
}

export function loadFolderTree(path: string, revision: string, listener?: TreeListener) {
  const cacheKey = `${path}|${revision}`
  const existing = treeCache.get(cacheKey)
  if (existing) {
    if (listener) {
      existing.listeners.add(listener)
      if (existing.value) listener(existing.value)
    }
    return existing.promise
  }

  const entry = { listeners: new Set<TreeListener>() } as TreeCacheEntry
  if (listener) entry.listeners.add(listener)
  entry.promise = buildFolderTree(path, {
    list: async (folderPath, next) => {
      const params = new URLSearchParams({ path: decodeURIComponent(folderPath) })
      if (next) params.set('next', next)
      const token = getStoredToken(folderPath)
      const response = await withRequestSlot(() =>
        fetch(`/api?${params}`, token ? { headers: { 'od-protected-token': token } } : undefined),
      )
      if (!response.ok)
        throw new Error(response.status === 401 ? '此目录需要密码。' : `目录读取失败（${response.status}）。`)
      const data = await response.json()
      if (!data.folder) throw new Error('该路径不是文件夹。')
      return { value: data.folder.value, next: data.next }
    },
  }, value => {
    entry.value = value
    entry.listeners.forEach(update => update(value))
  })
  treeCache.set(cacheKey, entry)
  entry.promise.catch(() => treeCache.delete(cacheKey))
  return entry.promise
}

export function stopWatchingFolderTree(path: string, revision: string, listener: TreeListener) {
  treeCache.get(`${path}|${revision}`)?.listeners.delete(listener)
}

export function prefetchFolderTree(path: string, revision: string) {
  void loadFolderTree(path, revision).catch(() => undefined)
}
