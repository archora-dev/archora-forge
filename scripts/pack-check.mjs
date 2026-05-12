import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const packDir = mkdtempSync(join(tmpdir(), 'archora-forge-pack-check-'))
const packages = [
  'packages/config',
  'packages/runtime',
  'packages/core',
  'packages/adapters',
  'packages/templates',
  'packages/cli',
]
const forbidden = [
  '/node_modules/',
  '/prompts/',
  '/.vitepress/',
  '/screenshots/',
  '/archora-forge-audit-pack/',
  '.map',
]

try {
  for (const packagePath of packages) {
    const pack = spawnSync('pnpm', ['--dir', packagePath, 'pack', '--pack-destination', packDir], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    if (pack.status !== 0) {
      throw new Error(`pnpm pack failed for ${packagePath}:\n${pack.stderr}`)
    }
    const tarball =
      `${pack.stdout}\n${pack.stderr}`
      .trim()
      .split('\n')
      .findLast((line) => line.trim().endsWith('.tgz')) ??
      readdirSync(packDir)
        .filter((entry) => entry.endsWith('.tgz'))
        .sort()
        .at(-1)
    if (!tarball) {
      throw new Error(`pnpm pack did not return a tarball for ${packagePath}`)
    }

    const tarballPath = isAbsolute(tarball) ? tarball : join(packDir, tarball)
    const tar = spawnSync('tar', ['-tf', tarballPath], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    if (tar.status !== 0 && !tar.stdout) {
      throw new Error(`tar failed for ${tarballPath}:\n${tar.stderr || (tar.error?.message ?? '')}`)
    }
    const entries = tar.stdout
      .trim()
      .split('\n')
    const badEntries = entries.filter((entry) => forbidden.some((pattern) => entry.includes(pattern)))
    if (badEntries.length > 0) {
      throw new Error(`${packagePath} contains forbidden pack entries:\n${badEntries.join('\n')}`)
    }
    if (!entries.some((entry) => entry.endsWith('/dist/index.js'))) {
      throw new Error(`${packagePath} pack is missing dist/index.js`)
    }
    if (!entries.some((entry) => entry.endsWith('/dist/index.d.ts'))) {
      throw new Error(`${packagePath} pack is missing dist/index.d.ts`)
    }

    console.log(`${packagePath}: ${entries.length} files`)
  }
} finally {
  rmSync(packDir, { recursive: true, force: true })
}
