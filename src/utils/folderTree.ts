export type FolderTreeItem = {
  id: string
  name: string
  folder?: unknown
}

export type FolderTreeNode = {
  id: string
  name: string
  path: string
  isFolder: boolean
  children: FolderTreeNode[]
  error?: string
}

type FolderTreePage = {
  value: FolderTreeItem[]
  next?: string
}

type FolderTreeSource = {
  list: (path: string, next?: string, signal?: AbortSignal) => Promise<FolderTreePage>
}

type BuildFolderTreeOptions = {
  nestedDelayMs?: number
  signal?: AbortSignal
}

const compareItems = (a: FolderTreeItem, b: FolderTreeItem) => {
  if (Boolean(a.folder) !== Boolean(b.folder)) return a.folder ? -1 : 1
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
}

export async function buildFolderTree(
  rootPath: string,
  source: FolderTreeSource,
  onProgress?: (nodes: FolderTreeNode[]) => void,
  options: BuildFolderTreeOptions = {},
): Promise<FolderTreeNode[]> {
  let root: FolderTreeNode[] = []
  const publish = () => onProgress?.([...root])
  const throwIfAborted = () => {
    if (options.signal?.aborted) throw new Error('目录读取已取消。')
  }
  const waitForNestedDelay = async () => {
    if (!options.nestedDelayMs) return
    throwIfAborted()
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer)
        reject(new Error('目录读取已取消。'))
      }
      const timer = setTimeout(resolve, options.nestedDelayMs)
      options.signal?.addEventListener('abort', abort, { once: true })
    })
  }

  const readFolder = async (folderPath: string): Promise<FolderTreeNode[]> => {
    throwIfAborted()
    const items: FolderTreeItem[] = []
    const visitedPages = new Set<string>()
    let next: string | undefined
    do {
      throwIfAborted()
      if (next && visitedPages.has(next)) throw new Error('Folder pagination loop detected.')
      if (next) visitedPages.add(next)
      const page = await source.list(folderPath, next, options.signal)
      items.push(...page.value.filter(item => !item.name.startsWith('.')))
      next = page.next
    } while (next)

    return items.sort(compareItems).map(item => {
      const path = `${folderPath === '/' ? '' : folderPath}/${encodeURIComponent(item.name)}`
      const isFolder = Boolean(item.folder)
      return {
        id: item.id,
        name: item.name,
        path,
        isFolder,
        children: [],
      }
    })
  }

  const populateFolders = async (nodes: FolderTreeNode[]) => {
    throwIfAborted()
    await Promise.all(
      nodes.map(async node => {
        if (!node.isFolder) return
        try {
          node.children = await readFolder(node.path)
          publish()
          await populateFolders(node.children)
        } catch (reason) {
          if (options.signal?.aborted) throw reason
          node.error = reason instanceof Error ? reason.message : '目录读取失败。'
          publish()
        }
      }),
    )
  }

  root = await readFolder(rootPath)
  publish()
  await waitForNestedDelay()
  await populateFolders(root)
  return root
}

export function countFolderTree(nodes: FolderTreeNode[]) {
  return nodes.reduce(
    (total, node) => {
      if (node.isFolder) {
        const nested = countFolderTree(node.children)
        total.folders += 1 + nested.folders
        total.files += nested.files
      } else {
        total.files += 1
      }
      return total
    },
    { files: 0, folders: 0 },
  )
}
