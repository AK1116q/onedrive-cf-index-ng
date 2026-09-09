const technicalName =
  /raws?|studio|bdrip|bluray|web-?dl|webrip|hevc|avc|x26[45]|10bit|flac|aac|mkv|mp4|1080p?|2160p?|ma10p|字幕|简繁|外挂|全集|特典|映像|字幕组/i

const knownAliases = new Map([['mobile suit gundam 00', '机动战士高达00']])

const cleanCandidate = (value: string) =>
  value
    .normalize('NFKC')
    .replace(/\.(?:mkv|mp4|avi|mov)$/i, '')
    .replace(/\bS\d{1,2}E\d{1,3}\b/gi, '')
    .replace(/\b(?:EP?|SP)\s*\d{1,3}\b/gi, '')
    .replace(/(?:第\s*\d+\s*[话話集]|\d{1,3}\s*[-~至]\s*\d{1,3}\s*(?:集|话|話))/g, '')
    .replace(/[._]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—|]+|[\s\-–—|]+$/g, '')

export function cleanAnimeTitle(folderName: string) {
  const bracketed = Array.from(folderName.matchAll(/[\[【](.*?)[\]】]/g), match => cleanCandidate(match[1]))
  const plain = cleanCandidate(folderName.replace(/[\[【].*?[\]】]/g, ' '))
  if (plain.length >= 2 && !technicalName.test(plain)) return knownAliases.get(plain.toLocaleLowerCase()) ?? plain
  const candidates = bracketed.filter(value => value.length >= 2 && !technicalName.test(value))
  return candidates.sort((a, b) => b.length - a.length)[0] || plain || cleanCandidate(folderName)
}

export const normalizeAnimeTitle = (value: string) =>
  value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]/gi, '')

export type BangumiSubject = {
  id: number
  name: string
  name_cn?: string
  images?: { large?: string; medium?: string; common?: string; grid?: string }
}

export function pickBangumiSubject(query: string, subjects: BangumiSubject[]) {
  const normalizedQuery = normalizeAnimeTitle(query)
  if (normalizedQuery.length < 3) return null

  const scored = subjects.map((subject, index) => {
    const names = [subject.name_cn, subject.name].filter(Boolean).map(name => normalizeAnimeTitle(name!))
    const score = Math.max(
      ...names.map(name => {
        if (name === normalizedQuery) return 100
        if (name.startsWith(normalizedQuery) || normalizedQuery.startsWith(name)) return 85
        if (name.includes(normalizedQuery) || normalizedQuery.includes(name)) return 70
        return Math.max(0, 45 - index * 5)
      }),
    )
    return { subject, score }
  })

  const best = scored.sort((a, b) => b.score - a.score)[0]
  if (!best) return null
  if (best.score >= 70) return best.subject
  return /[a-z]/i.test(query) && normalizedQuery.length >= 6 ? subjects[0] ?? null : null
}
