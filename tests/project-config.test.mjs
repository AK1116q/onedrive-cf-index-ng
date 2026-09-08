import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const apiConfig = require('../config/api.config.js')

test('metadata KV cache is enabled with a stale fallback window', () => {
  assert.equal(apiConfig.kvCache.enabled, true)
  assert.equal(typeof apiConfig.kvCache.ttlSeconds, 'number')
  assert.equal(typeof apiConfig.kvCache.staleSeconds, 'number')
  assert.ok(apiConfig.kvCache.ttlSeconds > 0)
  assert.ok(apiConfig.kvCache.staleSeconds > apiConfig.kvCache.ttlSeconds)
})

test('edge cache-control keeps browser cache disabled while allowing edge revalidation', () => {
  assert.match(apiConfig.cacheControlHeader, /max-age=0/)
  assert.match(apiConfig.cacheControlHeader, /s-maxage=60/)
  assert.match(apiConfig.cacheControlHeader, /stale-while-revalidate/)
})
