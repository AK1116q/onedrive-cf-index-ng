import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Buffer } from 'node:buffer'
import { URL } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'

const loadTs = async path => {
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}
const { findFolderCover } = await loadTs('../src/utils/folderCover.ts')
const { coverPreviewLayout } = await loadTs('../src/utils/coverPreviewLayout.ts')
const file = (name, id = name) => ({ name, id })
const folder = name => ({ ...file(name), folder: {} })

test('finds a thumbnail inside a season directory and skips missing thumbnails', async () => {
  const lookedUp = []
  const result = await findFolderCover('/Show', {
    canRead: () => true,
    list: async path => ({ value: path === '/Show' ? [folder('Season 1')] : [file('01.mkv'), file('02.mkv')] }),
    thumbnail: async id => {
      lookedUp.push(id)
      return id === '02.mkv' ? 'https://example.test/cover.jpg' : null
    },
  })
  assert.deepEqual(lookedUp, ['01.mkv', '02.mkv'])
  assert.equal(result.path, '/Show/Season 1/02.mkv')
})

test('prefers an explicit poster over generic images and episode frames', async () => {
  const result = await findFolderCover('/Show', {
    canRead: () => true,
    list: async () => ({ value: [file('01.mkv'), file('art.jpg'), file('poster.png')] }),
    thumbnail: async id => `https://example.test/${id}`,
  })
  assert.equal(result.path, '/Show/poster.png')
})

test('follows pagination without traversing protected folders or files', async () => {
  const requested = []
  const result = await findFolderCover('/Show', {
    canRead: path => !path.includes('/Private'),
    list: async (path, next) => {
      requested.push([path, next])
      return next ? { value: [file('cover.jpg')] } : { value: [folder('Private'), file('Private.jpg')], next: 'page2' }
    },
    thumbnail: async id => `https://example.test/${id}`,
  })
  assert.equal(result.path, '/Show/cover.jpg')
  assert.deepEqual(requested, [
    ['/Show', undefined],
    ['/Show', 'page2'],
  ])
})

test('empty folders and endless pagination terminate within the request budget', async () => {
  let requests = 0
  const result = await findFolderCover('/Show', {
    canRead: () => true,
    list: async () => ({ value: [], next: `page${++requests}` }),
    thumbnail: async () => assert.fail('No media was listed'),
  })
  assert.equal(result, null)
  assert.equal(requests, 12)
})

test('deep directory trees and repeated unusable videos have bounded work', async () => {
  let lists = 0
  await findFolderCover('/Show', {
    canRead: () => true,
    list: async () => {
      lists++
      return { value: [folder('nested')] }
    },
    thumbnail: async () => null,
  })
  assert.equal(lists, 4)
  let thumbnails = 0
  await findFolderCover('/Show', {
    canRead: () => true,
    list: async () => ({ value: Array.from({ length: 100 }, (_, i) => file(`${i}.mkv`)) }),
    thumbnail: async () => {
      thumbnails++
      return null
    },
  })
  assert.equal(thumbnails, 8)
})

test('hover preview uses a square image occupying about one fifth of the viewport and stays within every edge', () => {
  for (const viewport of [
    { width: 1270, height: 1307 },
    { width: 1920, height: 1080 },
    { width: 768, height: 600 },
  ]) {
    for (const left of [0, viewport.width - 160]) {
      for (const top of [0, viewport.height - 210]) {
        const box = coverPreviewLayout(viewport, { left, top, width: 160, height: 210 })
        assert.ok(Math.abs((box.imageSize * box.imageSize) / (viewport.width * viewport.height) - 0.2) < 0.01)
        assert.equal(box.width, box.imageSize + 26)
        assert.ok(box.left >= 16 && box.top >= 64)
        assert.ok(box.left + box.width <= viewport.width - 16)
        assert.ok(box.top + box.imageSize + 26 + 136 <= viewport.height - 16)
      }
    }
  }
})
