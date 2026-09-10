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
const { buildFolderTree, countFolderTree } = await loadTs('../src/utils/folderTree.ts')
const { cleanAnimeTitle, pickBangumiSubject } = await loadTs('../src/utils/animeTitle.ts')
const { shouldLoadFolderImage } = await loadTs('../src/utils/folderCoverPolicy.ts')
const { getEpisodeLabel } = await loadTs('../src/utils/episodeLabel.ts')
const { assToVtt, getSubtitleCandidates, srtToVtt } = await loadTs('../src/utils/subtitleTracks.ts')

test('only root-level folders load remote cover images', () => {
  assert.equal(shouldLoadFolderImage('/', true), true)
  assert.equal(shouldLoadFolderImage('/Anime', true), false)
  assert.equal(shouldLoadFolderImage('/Anime/Season%201', true), false)
  assert.equal(shouldLoadFolderImage('/', false), false)
})

test('extracts readable episode labels from common anime filenames', () => {
  assert.equal(getEpisodeLabel('[Nix-Raws] Show - S01E03.mkv'), 'S1 · 第 03 集')
  assert.equal(getEpisodeLabel('Show EP12 1080p.mkv'), '第 12 集')
  assert.equal(getEpisodeLabel('Show 第7话.mkv'), '第 07 集')
  assert.equal(getEpisodeLabel('NCOP.mkv'), null)
})

test('builds same-name subtitle candidates for browser video playback', () => {
  assert.deepEqual(getSubtitleCandidates('/Show/Episode%2001.mkv'), [
    { format: 'vtt', path: '/Show/Episode%2001.vtt' },
    { format: 'srt', path: '/Show/Episode%2001.srt' },
    { format: 'ass', path: '/Show/Episode%2001.ass' },
    { format: 'ass', path: '/Show/Episode%2001.ssa' },
  ])
})

test('converts srt subtitles to webvtt', () => {
  assert.equal(
    srtToVtt('1\r\n00:00:01,250 --> 00:00:03,500\r\n你好\r\n\r\n2\r\n00:00:04,000 --> 00:00:05,000\r\n世界'),
    'WEBVTT\n\n00:00:01.250 --> 00:00:03.500\n你好\n\n00:00:04.000 --> 00:00:05.000\n世界\n',
  )
})

test('converts simple ass dialogue subtitles to webvtt', () => {
  const ass = [
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    'Dialogue: 0,0:00:01.20,0:00:03.40,Default,,0,0,0,,{\\i1}第一行\\N第二行',
  ].join('\n')
  assert.equal(assToVtt(ass), 'WEBVTT\n\n00:00:01.200 --> 00:00:03.400\n第一行\n第二行\n')
})
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

test('cleans release metadata from anime folder names for Bangumi search', () => {
  assert.equal(cleanAnimeTitle('[VCB-Studio] Mobile Suit Gundam 00 [Ma10p_1080p]'), '机动战士高达00')
  assert.equal(
    cleanAnimeTitle('[DBD-Raws][机动战士高达0079][01-43TV全集+SP+特典映像][1080P][BDRip][HEVC-10bit]'),
    '机动战士高达0079',
  )
  assert.equal(cleanAnimeTitle('[Kirara Fantasia] 妙翻天 S01E08.mkv'), '妙翻天')
})

test('prefers an exact Chinese Bangumi title match', () => {
  const subject = pickBangumiSubject('机动战士高达00', [
    { id: 2, name: '機動戦士ガンダム00 セカンドシーズン', name_cn: '机动战士高达00 第二季' },
    { id: 1, name: '機動戦士ガンダム00', name_cn: '机动战士高达00' },
  ])
  assert.equal(subject?.id, 1)
  assert.equal(pickBangumiSubject('福利', [{ id: 3, name: 'Something else' }]), null)
  assert.equal(pickBangumiSubject('妙翻天', [{ id: 4, name: '笑ゥせぇるすまん', name_cn: '笑面推销员' }]), null)
  assert.equal(pickBangumiSubject('Mobile Suit Gundam 00', [{ id: 1, name: '機動戦士ガンダム00' }])?.id, 1)
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

test('folder hover tree reads pagination and preserves nested hierarchy', async () => {
  const tree = await buildFolderTree('/Show', {
    list: async (path, next) => {
      if (path === '/Show/Season%201') return { value: [file('10.mkv'), file('2.mkv')] }
      return next
        ? { value: [file('.password'), file('special.mkv')] }
        : { value: [file('trailer.mkv'), folder('Season 1')], next: 'page-2' }
    },
  })
  assert.deepEqual(
    tree.map(node => node.name),
    ['Season 1', 'special.mkv', 'trailer.mkv'],
  )
  assert.deepEqual(
    tree[0].children.map(node => node.name),
    ['2.mkv', '10.mkv'],
  )
  assert.deepEqual(countFolderTree(tree), { files: 4, folders: 1 })
})

test('folder hover tree can skip nested reads for fast previews', async () => {
  const requested = []
  const tree = await buildFolderTree(
    '/Show',
    {
      list: async path => {
        requested.push(path)
        if (path === '/Show/Season%201') return { value: [file('episode.mkv')] }
        return { value: [folder('Season 1'), file('trailer.mkv')] }
      },
    },
    undefined,
    { maxDepth: 0 },
  )

  assert.deepEqual(requested, ['/Show'])
  assert.deepEqual(
    tree.map(node => ({ name: node.name, children: node.children.length })),
    [
      { name: 'Season 1', children: 0 },
      { name: 'trailer.mkv', children: 0 },
    ],
  )
})

test('folder hover tree publishes the root before nested folders finish', async () => {
  let releaseNested
  const nestedReady = new Promise(resolve => {
    releaseNested = resolve
  })
  const updates = []
  const result = buildFolderTree(
    '/Show',
    {
      list: async path => {
        if (path === '/Show/Season%201') {
          await nestedReady
          return { value: [file('episode.mkv')] }
        }
        return { value: [folder('Season 1'), file('trailer.mkv')] }
      },
    },
    nodes => updates.push(nodes.map(node => ({ name: node.name, children: node.children.length }))),
  )

  await Promise.resolve()
  await Promise.resolve()
  assert.deepEqual(updates[0], [
    { name: 'Season 1', children: 0 },
    { name: 'trailer.mkv', children: 0 },
  ])
  releaseNested()
  await result
  assert.equal(updates.at(-1)[0].children, 1)
})

test('folder hover preview and file list stay inside the viewport', () => {
  const viewport = { width: 1270, height: 1307 }
  const box = coverPreviewLayout(viewport, { left: 1100, top: 1100, width: 160, height: 210 }, true)
  assert.ok(box.panelWidth >= 180)
  assert.ok(box.left >= 16 && box.left + box.width <= viewport.width - 16)
  assert.ok(box.top >= 64 && box.top + box.contentHeight + 26 <= viewport.height - 16)
})
