import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const workflow = readFileSync('.github/workflows/deploy-cloudflare-pages.yml', 'utf8')

test('deployment workflow validates Cloudflare credentials before deploying', () => {
  assert.match(workflow, /name:\s*Verify Cloudflare credentials/)
  assert.match(workflow, /pnpm exec wrangler whoami/)
})

test('deployment workflow publishes the Cloudflare Pages build output', () => {
  assert.match(workflow, /pnpm exec next-on-pages/)
  assert.match(workflow, /pnpm exec wrangler pages deploy \.vercel\/output\/static/)
  assert.match(workflow, /CLOUDFLARE_API_TOKEN/)
  assert.match(workflow, /CLOUDFLARE_ACCOUNT_ID/)
})
