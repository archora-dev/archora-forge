// Turnkey demo of the Forge frontend-impact hero feature.
//
//   pnpm build && pnpm impact:demo
//
// It takes the petstore schema used by examples/react-query, applies a breaking
// change (drops the pet-detail endpoint), and runs `archora-forge impact` against
// the example app — printing the exact PR comment a CI run would post.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const consumer = join(root, 'examples', 'react-query')
const beforeSchema = join(consumer, 'openapi.yaml')
const cli = join(root, 'packages', 'cli', 'dist', 'index.js')

// Drop the `/pets/{petId}:` path block (getPet/updatePet/deletePet) to simulate a
// breaking schema change, by cutting from its header to the next path or section.
function removePetDetailPath(text) {
  const lines = text.split('\n')
  const start = lines.findIndex((line) => line.startsWith('  /pets/{petId}:'))
  if (start < 0)
    throw new Error('Demo expects examples/react-query/openapi.yaml to define /pets/{petId}.')
  let end = start + 1
  while (end < lines.length && !/^ {2}\/\S/.test(lines[end]) && !/^\S/.test(lines[end])) end++
  return [...lines.slice(0, start), ...lines.slice(end)].join('\n')
}

const workDir = mkdtempSync(join(tmpdir(), 'forge-impact-demo-'))
const afterSchema = join(workDir, 'openapi.after.yaml')
const prComment = join(workDir, 'forge-impact-pr.md')
writeFileSync(afterSchema, removePetDetailPath(readFileSync(beforeSchema, 'utf8')))

const bar = '='.repeat(72)
console.log(`${bar}\nForge frontend-impact demo\n${bar}`)
console.log(`Before: ${beforeSchema}`)
console.log(`After:  ${afterSchema} (GET/PATCH/DELETE /pets/{petId} removed)`)
console.log(`Repo:   ${consumer}\n`)

try {
  execFileSync(
    'node',
    [
      cli,
      'impact',
      beforeSchema,
      afterSchema,
      '--repo',
      consumer,
      '--report',
      'markdown',
      '--pr-comment-file',
      prComment,
    ],
    { stdio: 'inherit' },
  )
} catch {
  // impact exits 1 when the change is blocked — expected for this breaking demo.
}

console.log(`\n${bar}\nPR comment that CI would post (forge-impact-pr.md):\n${bar}`)
console.log(readFileSync(prComment, 'utf8'))
