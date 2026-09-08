import type { KVNamespace } from '@cloudflare/workers-types'

import apiConfig from '../../config/api.config'

type CacheStatus = 'HIT' | 'MISS' | 'STALE' | 'BYPASS'

type CacheEntry<T> = {
  cachedAt: number
  value: T
}

export type CachedValue<T> = {
  status: CacheStatus
  value: T
}

const getKvNamespace = (): KVNamespace | null => {
  const { ONEDRIVE_CF_INDEX_KV } = process.env as unknown as { ONEDRIVE_CF_INDEX_KV?: KVNamespace }
  return ONEDRIVE_CF_INDEX_KV ?? null
}

const toHex = (bytes: ArrayBuffer): string =>
  Array.from(new Uint8Array(bytes))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')

export const buildCacheKey = async (scope: string, parts: Array<string | number | boolean | null | undefined>) => {
  const fingerprint = parts.map(part => String(part ?? '')).join('|')
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint))
  return `ocfi:${scope}:${toHex(hash)}`
}

export const getCachedJson = async <T>(key: string): Promise<CachedValue<T> | null> => {
  const kv = getKvNamespace()
  if (!kv || !apiConfig.kvCache?.enabled) return null

  const entry = await kv.get<CacheEntry<T>>(key, { type: 'json' })
  if (!entry) return null

  const age = Math.floor((Date.now() - entry.cachedAt) / 1000)
  const freshTtl = apiConfig.kvCache.ttlSeconds
  return {
    status: age <= freshTtl ? 'HIT' : 'STALE',
    value: entry.value,
  }
}

export const putCachedJson = async <T>(key: string, value: T) => {
  const kv = getKvNamespace()
  if (!kv || !apiConfig.kvCache?.enabled) return

  await kv.put(
    key,
    JSON.stringify({
      cachedAt: Date.now(),
      value,
    } satisfies CacheEntry<T>),
    {
      expirationTtl: apiConfig.kvCache.ttlSeconds + apiConfig.kvCache.staleSeconds,
    }
  )
}

export const cacheHeaders = (status: CacheStatus, extra?: HeadersInit): HeadersInit => ({
  'Cache-Control': status === 'BYPASS' ? 'no-cache' : apiConfig.cacheControlHeader,
  'X-OCFI-Cache': status,
  ...(extra ?? {}),
})
