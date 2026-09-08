import type { OdThumbnail } from '../../types'

import { posix as pathPosix } from 'path-browserify'
import axios from 'redaxios'

import { checkAuthRoute, encodePath, getAccessToken } from '.'
import apiConfig from '../../../config/api.config'
import { apiErrorResponse } from '../../utils/apiError'
import { buildCacheKey, cacheHeaders, getCachedJson, putCachedJson } from '../../utils/cacheStore'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export default async function handler(req: NextRequest): Promise<Response> {
  const accessToken = await getAccessToken()

  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'No access token.' }), { status: 403 })
  }

  // Get item thumbnails by its path since we will later check if it is protected
  const { path = '', size = 'medium', odpt = '' } = Object.fromEntries(req.nextUrl.searchParams)

  // Check whether the size is valid - must be one of 'large', 'medium', or 'small'
  if (size !== 'large' && size !== 'medium' && size !== 'small') {
    return new Response(JSON.stringify({ error: 'Invalid size.' }), { status: 400 })
  }
  // Sometimes the path parameter is defaulted to '[...path]' which we need to handle
  if (path === '[...path]') {
    return new Response(JSON.stringify({ error: 'No path specified.' }), { status: 400 })
  }
  // If the path is not a valid path, return 400
  if (typeof path !== 'string') {
    return new Response(JSON.stringify({ error: 'Path query invalid.' }), { status: 400 })
  }
  const cleanPath = pathPosix.resolve('/', pathPosix.normalize(path))

  const { code, message } = await checkAuthRoute(cleanPath, accessToken, odpt as string)
  // Status code other than 200 means user has not authenticated yet
  if (code !== 200) {
    return new Response(JSON.stringify({ error: message }), { status: code })
  }
  // If message is empty, then the path is not protected.
  // Conversely, protected routes are not allowed to serve from cache.
  const shouldUseKvCache = message === ''

  const requestPath = encodePath(cleanPath)
  // Handle response from OneDrive API
  const requestUrl = `${apiConfig.driveApi}/root${requestPath}`
  // Whether path is root, which requires some special treatment
  const isRoot = requestPath === ''
  const cacheKey = shouldUseKvCache ? await buildCacheKey('thumbnail', [cleanPath, size]) : ''
  const cached = shouldUseKvCache ? await getCachedJson<string>(cacheKey) : null
  if (cached?.status === 'HIT') {
    return new Response(null, {
      status: 302,
      headers: {
        Location: cached.value,
        ...cacheHeaders('HIT'),
      },
    })
  }

  try {
    const { data } = await axios.get(`${requestUrl}${isRoot ? '' : ':'}/thumbnails`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    const thumbnailUrl = data.value && data.value.length > 0 ? (data.value[0] as OdThumbnail)[size].url : null
    if (thumbnailUrl) {
      if (shouldUseKvCache) {
        await putCachedJson(cacheKey, thumbnailUrl)
      }
      return new Response(null, {
        status: 302,
        headers: {
          Location: thumbnailUrl,
          ...cacheHeaders(shouldUseKvCache ? 'MISS' : 'BYPASS'),
        },
      })
    } else {
      return new Response(JSON.stringify({ error: "The item doesn't have a valid thumbnail." }), { status: 400 })
    }
  } catch (error: any) {
    if (cached?.status === 'STALE') {
      return new Response(null, {
        status: 302,
        headers: {
          Location: cached.value,
          ...cacheHeaders('STALE', {
            Warning: '110 - "Response served from stale KV cache after OneDrive request failed"',
          }),
        },
      })
    }
    return apiErrorResponse(error)
  }
}
