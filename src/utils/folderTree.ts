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

export async function buildFolderTree(
  rootPath: string,
  source: FolderTreeSource,
  onProgress?: (nodes: FolderTreeNode[]) => void,
): Promise<FolderTreeNode[]> {
  let root: FolderTreeNode[] = []
  const publish = () => onProgress?.([...root])

  const readFolder = async (folderPath: string): Promise<FolderTreeNode[]> => {
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
    await Promise.all(
      nodes.map(async node => {
        if (!node.isFolder) return
        try {
          node.children = await readFolder(node.path)
          publish()
          await populateFolders(node.children)
        } catch (reason) {
          node.error = reason instanceof Error ? reason.message : '目录读取失败。'
          publish()
        }
      }),
    )
  }

  root = await readFolder(rootPath)
  publish()
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
