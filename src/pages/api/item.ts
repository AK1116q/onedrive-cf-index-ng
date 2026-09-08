import axios from 'redaxios'

import { getAccessToken } from '.'
import apiConfig from '../../../config/api.config'
import { apiErrorResponse } from '../../utils/apiError'
import { buildCacheKey, cacheHeaders, getCachedJson, putCachedJson } from '../../utils/cacheStore'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export default async function handler(req: NextRequest): Promise<Response> {
  // Get access token from storage
  const accessToken = await getAccessToken()

  // Get item details (specifically, its path) by its unique ID in OneDrive
  const { id = '' } = Object.fromEntries(req.nextUrl.searchParams)

  if (typeof id === 'string') {
    const idPattern = /^[a-zA-Z0-9]+$/
    if (!idPattern.test(id)) {
      // ID contains characters other than letters and numbers
      return new Response(JSON.stringify({ error: 'Invalid driveItem ID.' }), { status: 400 })
    }

    const itemApi = `${apiConfig.driveApi}/items/${id}`
    const cacheKey = await buildCacheKey('item', [id])
    const cached = await getCachedJson(cacheKey)
    if (cached?.status === 'HIT') {
      return NextResponse.json(cached.value, {
        headers: cacheHeaders('HIT'),
      })
    }

    try {
      const { data } = await axios.get(itemApi, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          select: 'id,name,parentReference',
        },
      })
      await putCachedJson(cacheKey, data)
      return NextResponse.json(data, {
        headers: cacheHeaders('MISS'),
      })
    } catch (error: any) {
      if (cached?.status === 'STALE') {
        return NextResponse.json(cached.value, {
          headers: cacheHeaders('STALE', {
            Warning: '110 - "Response served from stale KV cache after OneDrive request failed"',
          }),
        })
      }
      return apiErrorResponse(error)
    }
  } else {
    return new Response(JSON.stringify({ error: 'Invalid driveItem ID.' }), { status: 400 })
  }
}
