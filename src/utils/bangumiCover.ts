import { cleanAnimeTitle } from './animeTitle'

type CoverResult = { url: string | null; source: 'bangumi' | 'none' }
type CachedCover = CoverResult & { expiresAt: number }

const memoryCache = new Map<string, Promise<CoverResult>>()
const queue: Array<() => void> = []
let active = 0

const withSlot = async <T>(task: () => Promise<T>) => {
  if (active >= 3) await new Promise<void>(resolve => queue.push(resolve))
  active++
  try {
    return await task()
  } finally {
    active--
    queue.shift()?.()
  }
}

const cacheKey = (name: string) => `bangumi-cover:v1:${cleanAnimeTitle(name)}`

const readCache = (key: string): CoverResult | null => {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '') as CachedCover
    if (value.expiresAt > Date.now()) return { url: value.url, source: value.source }
    localStorage.removeItem(key)
  } catch {
    // Ignore unavailable or malformed browser storage.
  }
  return null
}

const writeCache = (key: string, result: CoverResult) => {
  try {
    const duration = result.url ? 30 * 86400000 : 86400000
    localStorage.setItem(key, JSON.stringify({ ...result, expiresAt: Date.now() + duration }))
  } catch {
    // The in-memory cache still avoids duplicate requests during this session.
  }
}

export function loadBangumiCover(name: string) {
  const key = cacheKey(name)
  const cached = readCache(key)
  if (cached) return Promise.resolve(cached)
  const existing = memoryCache.get(key)
  if (existing) return existing

  const request = withSlot(async () => {
    const response = await fetch(`/api/bangumi-cover?${new URLSearchParams({ name })}`)
    if (!response.ok) return { url: null, source: 'none' } as CoverResult
    const data = (await response.json()) as { cover?: string | null }
    return { url: data.cover ?? null, source: data.cover ? 'bangumi' : 'none' } as CoverResult
  }).then(result => {
    writeCache(key, result)
    return result
  })
  memoryCache.set(key, request)
  return request
}
