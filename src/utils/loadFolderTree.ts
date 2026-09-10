import { buildFolderTree } from './folderTree'
import { getStoredToken } from './protectedRouteHandler'

type TreeListener = (nodes: FolderTreeNode[]) => void
type TreeCacheEntry = {
  promise: Promise<FolderTreeNode[]>
  value?: FolderTreeNode[]
  listeners: Set<TreeListener>
}
type StoredTreeCacheEntry = {
  cachedAt: number
  value: FolderTreeNode[]
}

import type { FolderTreeNode } from './folderTree'

const treeCache = new Map<string, TreeCacheEntry>()
const waiting: Array<() => void> = []
let activeRequests = 0
const SESSION_CACHE_PREFIX = 'folder-tree-preview:'
const SESSION_CACHE_TTL = 1000 * 60 * 30

const canUseSessionStorage = () => typeof window !== 'undefined' && 'sessionStorage' in window

const readSessionCache = (cacheKey: string) => {
  if (!canUseSessionStorage()) return null
  try {
    const raw = window.sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${cacheKey}`)
    if (!raw) return null
    const stored = JSON.parse(raw) as StoredTreeCacheEntry
    if (!Array.isArray(stored.value) || Date.now() - stored.cachedAt > SESSION_CACHE_TTL) {
      window.sessionStorage.removeItem(`${SESSION_CACHE_PREFIX}${cacheKey}`)
      return null
    }
    return stored.value
  } catch {
    return null
  }
}

const writeSessionCache = (cacheKey: string, value: FolderTreeNode[]) => {
  if (!canUseSessionStorage()) return
  try {
    window.sessionStorage.setItem(`${SESSION_CACHE_PREFIX}${cacheKey}`, JSON.stringify({ cachedAt: Date.now(), value }))
  } catch {
    // Storage quota is best-effort here; the in-memory cache still covers the current page visit.
  }
}

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

  const stored = readSessionCache(cacheKey)
  if (stored) {
    const promise = Promise.resolve(stored)
    treeCache.set(cacheKey, { promise, value: stored, listeners: new Set<TreeListener>() })
    listener?.(stored)
    return promise
  }

  const entry = { listeners: new Set<TreeListener>() } as TreeCacheEntry
  if (listener) entry.listeners.add(listener)
  entry.promise = buildFolderTree(
    path,
    {
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
    },
    value => {
      entry.value = value
      entry.listeners.forEach(update => update(value))
    },
  )
  treeCache.set(cacheKey, entry)
  entry.promise.then(value => writeSessionCache(cacheKey, value))
  entry.promise.catch(() => treeCache.delete(cacheKey))
  return entry.promise
}

export function stopWatchingFolderTree(path: string, revision: string, listener: TreeListener) {
  treeCache.get(`${path}|${revision}`)?.listeners.delete(listener)
}
