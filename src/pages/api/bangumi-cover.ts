import type { BangumiSubject } from '../../utils/animeTitle'

import { NextRequest, NextResponse } from 'next/server'

import { cleanAnimeTitle, pickBangumiSubject } from '../../utils/animeTitle'

export const runtime = 'edge'

const responseHeaders = {
  'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
}

export default async function handler(req: NextRequest): Promise<Response> {
  const folderName = req.nextUrl.searchParams.get('name')?.trim() ?? ''
  if (!folderName || folderName.length > 240) {
    return NextResponse.json({ error: 'Invalid folder name.' }, { status: 400 })
  }

  const query = cleanAnimeTitle(folderName)
  if (query.length < 3) return NextResponse.json({ cover: null, query }, { headers: responseHeaders })

  try {
    const response = await fetch('https://api.bgm.tv/v0/search/subjects?limit=5', {
      method: 'POST',
      signal: AbortSignal.timeout(6000),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AK1116q/onedrive-cf-index-ng (https://github.com/AK1116q/onedrive-cf-index-ng)',
      },
      body: JSON.stringify({ keyword: query, sort: 'match', filter: { type: [2] } }),
    })
    if (!response.ok) throw new Error(`Bangumi returned ${response.status}.`)

    const data = (await response.json()) as { data?: BangumiSubject[] }
    const subject = pickBangumiSubject(query, data.data ?? [])
    const cover = subject?.images?.large ?? subject?.images?.medium ?? subject?.images?.common ?? null
    return NextResponse.json(
      {
        cover,
        query,
        subject: subject ? { id: subject.id, name: subject.name, nameCn: subject.name_cn } : null,
      },
      { headers: responseHeaders },
    )
  } catch {
    return NextResponse.json(
      { cover: null, query, error: 'Bangumi cover lookup failed.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
