import type { OdFolderChildren, OdThumbnail } from '../../types'

import { posix as pathPosix } from 'path-browserify'

import apiConfig from '../../../config/api.config'
import { checkAuthRoute, encodePath, getAccessToken, getAuthTokenPath } from '.'
import { apiErrorResponse } from '../../utils/apiError'
import { buildCacheKey, cacheHeaders, getCachedJson, putCachedJson } from '../../utils/cacheStore'
import { findFolderCover } from '../../utils/folderCover'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export default async function handler(req: NextRequest): Promise<Response> {
  const accessToken = await getAccessToken()
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'No access token.' }), { status: 403 })
  }

  const { path = '', size = 'large', odpt = '' } = Object.fromEntries(req.nextUrl.searchParams)

  if (size !== 'large' && size !== 'medium' && size !== 'small') {
    return new Response(JSON.stringify({ error: 'Invalid size.' }), { status: 400 })
  }

  if (path === '[...path]') {
    return new Response(JSON.stringify({ error: 'No path specified.' }), { status: 400 })
  }

  if (typeof path !== 'string') {
    return new Response(JSON.stringify({ error: 'Path query invalid.' }), { status: 400 })
  }

  const cleanPath = pathPosix.resolve('/', pathPosix.normalize(path))
  const { code, message } = await checkAuthRoute(cleanPath, accessToken, odpt as string)
  if (code !== 200) {
    return new Response(JSON.stringify({ error: message }), { status: code })
  }

  const shouldUseKvCache = message === ''
  const authScope = getAuthTokenPath(cleanPath)
  const canRead = (itemPath: string) => getAuthTokenPath(itemPath) === authScope
  const cacheKey = shouldUseKvCache ? await buildCacheKey('folder-cover-v2', [cleanPath, size]) : ''
  const entry = shouldUseKvCache ? await getCachedJson<{ url: string; path: string }>(cacheKey) : null
  const cached = entry && canRead(entry.value.path) ? entry : null

  if (cached?.status === 'HIT') {
    return new Response(null, {
      status: 302,
      headers: {
        Location: cached.value.url,
        ...cacheHeaders('HIT'),
      },
    })
  }

  try {
    const signal = AbortSignal.timeout(15000)
    const graphGet = async (url: string) => {
      const target = new URL(url)
      const drive = new URL(apiConfig.driveApi)
      if (target.origin !== drive.origin || !target.pathname.startsWith(`${drive.pathname}/`)) {
        throw new Error('Invalid thumbnail pagination URL.')
      }
      const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, signal })
      if (!response.ok) throw { response: { status: response.status }, message: 'Cover lookup failed.' }
      return response.json()
    }
    const cover = await findFolderCover(cleanPath, {
      canRead,
      list: async (folderPath, next) => {
        const requestPath = encodePath(folderPath)
        const url = new URL(`${apiConfig.driveApi}/root${requestPath}${requestPath ? ':' : ''}/children`)
        url.searchParams.set('$select', 'name,id,folder,file,video,image')
        url.searchParams.set('$top', '200')
        const data = await graphGet(next || url.toString())
        return { value: data.value as OdFolderChildren[], next: data['@odata.nextLink'] }
      },
      thumbnail: async id => {
        try {
          const data = await graphGet(`${apiConfig.driveApi}/items/${encodeURIComponent(id)}/thumbnails`)
          return (data.value?.[0] as OdThumbnail | undefined)?.[size]?.url ?? null
        } catch (error: any) {
          if (error?.response?.status === 404) return null
          throw error
        }
      },
    })
    if (!cover) {
      return new Response(JSON.stringify({ error: 'No cover thumbnail found.' }), {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    if (shouldUseKvCache) {
      await putCachedJson(cacheKey, cover)
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: cover.url,
        ...cacheHeaders(shouldUseKvCache ? 'MISS' : 'BYPASS'),
        ...(!shouldUseKvCache ? { 'Cache-Control': 'private, no-store' } : {}),
      },
    })
  } catch (error: any) {
    if (cached?.status === 'STALE') {
      return new Response(null, {
        status: 302,
        headers: {
          Location: cached.value.url,
          ...cacheHeaders('STALE', {
            Warning: '110 - "Response served from stale KV cache after OneDrive request failed"',
          }),
        },
      })
    }
    return apiErrorResponse(error)
  }
}
