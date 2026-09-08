import axios from 'redaxios'
import { encodePath, getAccessToken } from '.'
import apiConfig from '../../../config/api.config'
import siteConfig from '../../../config/site.config'
import { apiErrorResponse } from '../../utils/apiError'
import { buildCacheKey, cacheHeaders, getCachedJson, putCachedJson } from '../../utils/cacheStore'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

/**
 * Sanitize the search query
 *
 * @param query User search query, which may contain special characters
 * @returns Sanitised query string, which:
 * - encodes the '<' and '>' characters,
 * - replaces '?' and '/' characters with ' ',
 * - replaces ''' with ''''
 * Reference: https://stackoverflow.com/questions/41491222/single-quote-escaping-in-microsoft-graph.
 */
function sanitiseQuery(query: string): string {
  const sanitisedQuery = query
    .replace(/'/g, "''")
    .replace('<', ' &lt; ')
    .replace('>', ' &gt; ')
    .replace('?', ' ')
    .replace('/', ' ')
  return encodeURIComponent(sanitisedQuery)
}

export default async function handler(req: NextRequest): Promise<Response> {
  // Get access token from storage
  const accessToken = await getAccessToken()

  // Query parameter from request
  const { q: searchQuery = '' } = Object.fromEntries(req.nextUrl.searchParams)

  if (typeof searchQuery === 'string') {
    // Construct Microsoft Graph Search API URL, and perform search only under the base directory
    const searchRootPath = encodePath('/')
    const encodedPath = searchRootPath === '' ? searchRootPath : searchRootPath + ':'

    const searchApi = `${apiConfig.driveApi}/root${encodedPath}/search(q='${sanitiseQuery(searchQuery)}')`
    const cacheKey = await buildCacheKey('search', [searchQuery])
    const cached = await getCachedJson(cacheKey)
    if (cached?.status === 'HIT') {
      return NextResponse.json(cached.value, {
        headers: cacheHeaders('HIT'),
      })
    }

    try {
      const { data } = await axios.get(searchApi, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          select: 'id,name,file,folder,parentReference',
          top: siteConfig.maxItems,
        },
      })
      await putCachedJson(cacheKey, data.value)
      return NextResponse.json(data.value, {
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
    return NextResponse.json([])
  }
}
