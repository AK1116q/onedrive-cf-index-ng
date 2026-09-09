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
  list: (path: string, next?: string) => Promise<FolderTreePage>
}

const compareItems = (a: FolderTreeItem, b: FolderTreeItem) => {
  if (Boolean(a.folder) !== Boolean(b.folder)) return a.folder ? -1 : 1
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
}

export async function buildFolderTree(rootPath: string, source: FolderTreeSource): Promise<FolderTreeNode[]> {
  const loadFolder = async (folderPath: string): Promise<FolderTreeNode[]> => {
    const items: FolderTreeItem[] = []
    const visitedPages = new Set<string>()
    let next: string | undefined
    do {
      if (next && visitedPages.has(next)) throw new Error('Folder pagination loop detected.')
      if (next) visitedPages.add(next)
      const page = await source.list(folderPath, next)
      items.push(...page.value.filter(item => !item.name.startsWith('.')))
      next = page.next
    } while (next)

    return Promise.all(
      items.sort(compareItems).map(async item => {
        const path = `${folderPath === '/' ? '' : folderPath}/${encodeURIComponent(item.name)}`
        const isFolder = Boolean(item.folder)
        let children: FolderTreeNode[] = []
        let error: string | undefined
        if (isFolder) {
          try {
            children = await loadFolder(path)
          } catch (reason) {
            error = reason instanceof Error ? reason.message : '目录读取失败。'
          }
        }
        return {
          id: item.id,
          name: item.name,
          path,
          isFolder,
          children,
          error,
        }
      }),
    )
  }

  return loadFolder(rootPath)
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
