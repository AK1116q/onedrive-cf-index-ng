import { buildFolderTree } from './folderTree'
import { getStoredToken } from './protectedRouteHandler'

const treeCache = new Map<string, ReturnType<typeof buildFolderTree>>()
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

export function loadFolderTree(path: string, revision: string) {
  const cacheKey = `${path}|${revision}`
  const existing = treeCache.get(cacheKey)
  if (existing) return existing

  const request = buildFolderTree(path, {
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
  })
  treeCache.set(cacheKey, request)
  request.catch(() => treeCache.delete(cacheKey))
  return request
}
