import type { OdFolderChildren, OdThumbnail } from '../../types'

import { posix as pathPosix } from 'path-browserify'
import axios from 'redaxios'

import apiConfig from '../../../config/api.config'
import siteConfig from '../../../config/site.config'
import { checkAuthRoute, encodePath, getAccessToken } from '.'
import { apiErrorResponse } from '../../utils/apiError'
import { buildCacheKey, cacheHeaders, getCachedJson, putCachedJson } from '../../utils/cacheStore'
import { getExtension } from '../../utils/getFileIcon'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const coverExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mkv', 'webm', 'mov', 'flv'])

const isCoverCandidate = (item: OdFolderChildren) => {
  if (item.folder) return false
  if (item.image || item.video) return true
  return coverExtensions.has(getExtension(item.name))
}

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
  const cacheKey = shouldUseKvCache ? await buildCacheKey('folder-cover', [cleanPath, size]) : ''
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
    const requestPath = encodePath(cleanPath)
    const requestUrl = `${apiConfig.driveApi}/root${requestPath}`
    const isRoot = requestPath === ''
    const { data: folderData } = await axios.get(`${requestUrl}${isRoot ? '' : ':'}/children`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        select: 'name,id,folder,file,video,image,lastModifiedDateTime,size',
        $top: siteConfig.maxItems,
      },
    })

    const coverItem = (folderData.value as OdFolderChildren[]).find(isCoverCandidate)
    if (!coverItem) {
      return new Response(JSON.stringify({ error: 'No cover candidate found.' }), { status: 404 })
    }

    const { data: thumbnailData } = await axios.get(`${apiConfig.driveApi}/items/${coverItem.id}/thumbnails`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    const thumbnailUrl =
      thumbnailData.value && thumbnailData.value.length > 0 ? (thumbnailData.value[0] as OdThumbnail)[size].url : null
    if (!thumbnailUrl) {
      return new Response(JSON.stringify({ error: 'No cover thumbnail found.' }), { status: 404 })
    }

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
