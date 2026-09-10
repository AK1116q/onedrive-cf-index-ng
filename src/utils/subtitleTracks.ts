export type SubtitleFormat = 'vtt' | 'srt' | 'ass'

export type SubtitleCandidate = {
  format: SubtitleFormat
  path: string
}

const subtitleExtensions: Array<{ extension: string; format: SubtitleFormat }> = [
  { extension: 'vtt', format: 'vtt' },
  { extension: 'srt', format: 'srt' },
  { extension: 'ass', format: 'ass' },
  { extension: 'ssa', format: 'ass' },
]

export function getSubtitleCandidates(videoPath: string): SubtitleCandidate[] {
  const extensionStart = videoPath.lastIndexOf('.')
  const basePath = extensionStart > -1 ? videoPath.substring(0, extensionStart) : videoPath
  return subtitleExtensions.map(({ extension, format }) => ({ format, path: `${basePath}.${extension}` }))
}

const normalizeText = (value: string) =>
  value
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .trim()

const normalizeSrtTimestamp = (value: string) =>
  value.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, (_match, time, milliseconds) => `${time}.${milliseconds}`)

export function srtToVtt(value: string) {
  const cues = normalizeText(value)
    .split(/\n{2,}/)
    .map(block => {
      const lines = block
        .split('\n')
        .map(line => line.trimEnd())
        .filter(Boolean)
      if (/^\d+$/.test(lines[0])) lines.shift()
      const timingIndex = lines.findIndex(line => line.includes('-->'))
      if (timingIndex === -1) return ''
      const timing = normalizeSrtTimestamp(lines[timingIndex])
      const text = lines.slice(timingIndex + 1).join('\n')
      return text ? `${timing}\n${text}` : ''
    })
    .filter(Boolean)

  return `WEBVTT\n\n${cues.join('\n\n')}\n`
}

const assTimestampToVtt = (value: string) => {
  const match = value.trim().match(/^(\d+):(\d{2}):(\d{2})(?:[.](\d{1,3}))?$/)
  if (!match) return ''
  const [, hours, minutes, seconds, fraction = '0'] = match
  const milliseconds = fraction.padEnd(3, '0').slice(0, 3)
  return `${hours.padStart(2, '0')}:${minutes}:${seconds}.${milliseconds}`
}

const cleanAssText = (value: string) =>
  value
    .replace(/\{[^}]*}/g, '')
    .replace(/\\N/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\h/g, ' ')
    .trim()

export function assToVtt(value: string) {
  const lines = normalizeText(value).split('\n')
  let fields: string[] = []
  const cues: string[] = []

  for (const line of lines) {
    const format = line.match(/^Format:\s*(.+)$/i)
    if (format) {
      fields = format[1].split(',').map(field => field.trim().toLowerCase())
      continue
    }

    const dialogue = line.match(/^Dialogue:\s*(.+)$/i)
    if (!dialogue || fields.length === 0) continue

    const startIndex = fields.indexOf('start')
    const endIndex = fields.indexOf('end')
    const textIndex = fields.indexOf('text')
    if (startIndex === -1 || endIndex === -1 || textIndex === -1) continue

    const parts = dialogue[1].split(',')
    const start = assTimestampToVtt(parts[startIndex] ?? '')
    const end = assTimestampToVtt(parts[endIndex] ?? '')
    const text = cleanAssText(parts.slice(textIndex).join(','))
    if (!start || !end || !text) continue
    cues.push(`${start} --> ${end}\n${text}`)
  }

  return `WEBVTT\n\n${cues.join('\n\n')}\n`
}

export function subtitleTextToVtt(value: string, format: SubtitleFormat) {
  if (format === 'vtt') {
    const text = normalizeText(value)
    return text.startsWith('WEBVTT') ? `${text}\n` : `WEBVTT\n\n${text}\n`
  }
  if (format === 'srt') return srtToVtt(value)
  return assToVtt(value)
}
