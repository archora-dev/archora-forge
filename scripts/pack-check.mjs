import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
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
const forbidden = ['/node_modules/', '/prompts/', '/.vitepress/', '/screenshots/', '.map']

try {
  const tarballs = []
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
    const entries = tar.stdout.trim().split('\n')
    const badEntries = entries.filter((entry) =>
      forbidden.some((pattern) => entry.includes(pattern)),
    )
    if (badEntries.length > 0) {
      throw new Error(`${packagePath} contains forbidden pack entries:\n${badEntries.join('\n')}`)
    }
    if (!entries.some((entry) => entry.endsWith('/dist/index.js'))) {
      throw new Error(`${packagePath} pack is missing dist/index.js`)
    }
    if (!entries.some((entry) => entry.endsWith('/dist/index.d.ts'))) {
      throw new Error(`${packagePath} pack is missing dist/index.d.ts`)
    }

    const packageJson = JSON.parse(readFileSync(join(root, packagePath, 'package.json'), 'utf8'))
    tarballs.push({ name: packageJson.name, path: tarballPath })
    console.log(`${packagePath}: ${entries.length} files`)
  }

  const consumerDir = mkdtempSync(join(tmpdir(), 'archora-forge-pack-consumer-'))
  try {
    writeFileSync(
      join(consumerDir, 'package.json'),
      JSON.stringify(
        {
          type: 'module',
          private: true,
          dependencies: Object.fromEntries(
            tarballs.map((tarball) => [tarball.name, `file:${tarball.path}`]),
          ),
          pnpm: {
            overrides: Object.fromEntries(
              tarballs.map((tarball) => [tarball.name, `file:${tarball.path}`]),
            ),
          },
        },
        null,
        2,
      ),
    )
    // pnpm 9 reads overrides from package.json#pnpm.overrides; pnpm 10+ reads them from
    // pnpm-workspace.yaml. Write both so the local pack check works regardless of the
    // installed pnpm version (CI pins 9.15.4). Overrides force the @archora/* transitive
    // ranges to the freshly packed tarballs instead of the npm registry.
    writeFileSync(
      join(consumerDir, 'pnpm-workspace.yaml'),
      `overrides:\n${tarballs.map((tarball) => `  '${tarball.name}': 'file:${tarball.path}'`).join('\n')}\n`,
    )
    const install = spawnSync(
      'pnpm',
      ['install', '--store-dir', join(consumerDir, '.pnpm-store')],
      {
        cwd: consumerDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
    if (install.status !== 0) {
      throw new Error(`consumer install failed:\n${install.stderr || install.stdout}`)
    }

    writeFileSync(
      join(consumerDir, 'smoke.mjs'),
      [
        "import { createCli } from '@archora/forge-cli'",
        "import { defineForgeConfig, resolveForgeConfig } from '@archora/forge-config'",
        "import { createApiClient } from '@archora/forge-runtime'",
        "import { normalizeOpenApi } from '@archora/forge-core'",
        "import { mapMetadataField } from '@archora/forge-adapters'",
        "import { createBarrelTemplate } from '@archora/forge-templates'",
        '',
        "if (typeof createCli !== 'function') throw new Error('missing cli export')",
        "if (defineForgeConfig({ input: './openapi.yaml' }).input !== './openapi.yaml') throw new Error('missing config export')",
        "if (resolveForgeConfig({ input: './openapi.yaml' }).input !== './openapi.yaml') throw new Error('missing resolved config export')",
        "if (typeof createApiClient !== 'function') throw new Error('missing runtime export')",
        "if (normalizeOpenApi({ openapi: '3.0.3', paths: {} }).operations.length !== 0) throw new Error('missing core export')",
        "if (mapMetadataField({ type: 'string' }).input !== 'text') throw new Error('missing adapters export')",
        "if (!createBarrelTemplate(['users']).includes(\"'./users.js'\")) throw new Error('missing templates export')",
        '',
      ].join('\n'),
    )
    const smoke = spawnSync(process.execPath, ['smoke.mjs'], {
      cwd: consumerDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    if (smoke.status !== 0) {
      throw new Error(`consumer smoke import failed:\n${smoke.stderr || smoke.stdout}`)
    }
    console.log('consumer install smoke: ok')
  } finally {
    rmSync(consumerDir, { recursive: true, force: true })
  }
} finally {
  rmSync(packDir, { recursive: true, force: true })
}
