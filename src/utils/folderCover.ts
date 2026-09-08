type CoverItem = {
  id: string
  name: string
  folder?: unknown
  image?: unknown
  video?: unknown
}

type CoverPage = { value: CoverItem[]; next?: string }
type CoverSource = {
  list: (path: string, next?: string) => Promise<CoverPage>
  thumbnail: (id: string) => Promise<string | null>
  canRead: (path: string) => boolean
}

const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'])
const videoExtensions = new Set(['mp4', 'mkv', 'webm', 'mov', 'flv', 'ts', 'm4v', 'avi'])

const priority = (item: CoverItem) => {
  if (item.folder) return 0
  const extension = item.name.split('.').pop()?.toLowerCase() ?? ''
  if (item.image || imageExtensions.has(extension)) {
    return /^(cover|poster|folder|front|封面)([._ -]|$)/i.test(item.name) ? 3 : 2
  }
  return item.video || videoExtensions.has(extension) ? 1 : 0
}

// Bound both pagination and traversal so a large library cannot trigger an unbounded scan.
export async function findFolderCover(root: string, source: CoverSource) {
  const queue: Array<{ path: string; depth: number; next?: string }> = [{ path: root, depth: 0 }]
  const visited = new Set<string>()
  let pages = 0
  let attempts = 0
  while (queue.length && pages < 12 && attempts < 8) {
    const current = queue.shift()!
    const key = JSON.stringify([current.path, current.next])
    if (visited.has(key) || !source.canRead(current.path)) continue
    visited.add(key)
    pages++
    const page = await source.list(current.path, current.next)
    const items = page.value.filter(item => {
      const itemPath = `${current.path.replace(/\/$/, '')}/${item.name}`
      return !item.name.startsWith('.') && source.canRead(itemPath)
    })
    const candidates = items.filter(item => priority(item) > 0).sort((a, b) => priority(b) - priority(a))
    for (const item of candidates) {
      if (attempts++ >= 8) break
      const url = await source.thumbnail(item.id)
      if (url) return { url, path: `${current.path.replace(/\/$/, '')}/${item.name}` }
    }
    if (current.depth < 3) {
      for (const item of items.filter(item => item.folder)) {
        if (queue.length >= 24) break
        queue.push({ path: `${current.path.replace(/\/$/, '')}/${item.name}`, depth: current.depth + 1 })
      }
    }
    if (page.next) queue.push({ ...current, next: page.next })
  }
  return null
}
