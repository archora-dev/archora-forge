import { access } from 'node:fs/promises'

import type { CAC } from 'cac'

import { requireCommercialLicense } from '../license.js'
import { writeReportFile } from '../report-file.js'
import { logger } from '../ui/logger.js'

type CiOptions = {
  force?: boolean
  output?: string
  mode?: string
  gate?: string
  schema?: string
  base?: string
}

export function registerCiCommand(cli: CAC): void {
  cli
    .command('ci <action> <provider>', 'Create CI workflow templates for Forge impact review')
    .option('--force', 'Overwrite an existing workflow file')
    .option('--output <path>', 'Write workflow to a custom path')
    .option('--mode <mode>', 'Workflow mode: impact or pilot')
    .option('--gate <mode>', 'Merge gate mode: block or comment')
    .option('--schema <path>', 'OpenAPI schema path inside the repository')
    .option('--base <ref>', 'Git base ref for previous schema')
    .action(async (action: string, provider: string, options: CiOptions) => {
      await requireCommercialLicense('ci')
      if (action !== 'init') throw new Error(`Unknown CI action "${action}". Use init.`)
      if (provider !== 'github')
        throw new Error(`Unsupported CI provider "${provider}". Use github.`)
      const mode = normalizeMode(options.mode)
      const gate = normalizeGate(options.gate)

      const path = options.output ?? '.github/workflows/archora-forge-impact.yml'
      if ((await fileExists(path)) && !options.force) {
        logger.warn(`${path} already exists`)
        logger.line('Use --force to overwrite it.')
        return
      }

      await writeReportFile(
        path,
        createGithubImpactWorkflow({
          mode,
          gate,
          schema: options.schema ?? 'openapi.yaml',
          base: options.base ?? 'origin/main',
        }),
      )
      logger.success(`Created ${path}`)
      logger.line('Next: review OPENAPI_SCHEMA and OPENAPI_BASE_REF for your repository.')
    })
}

async function fileExists(path: string): Promise<boolean> {
  return access(path)
    .then(() => true)
    .catch(() => false)
}

function normalizeMode(value: string | undefined): 'impact' | 'pilot' {
  if (!value) return 'impact'
  if (value === 'impact' || value === 'pilot') return value
  throw new Error('Invalid CI mode. Use impact or pilot.')
}

function normalizeGate(value: string | undefined): 'block' | 'comment' {
  if (!value) return 'block'
  if (value === 'block' || value === 'comment') return value
  throw new Error('Invalid CI gate mode. Use block or comment.')
}

function createGithubImpactWorkflow(options: {
  mode: 'impact' | 'pilot'
  gate: 'block' | 'comment'
  schema: string
  base: string
}): string {
  const runStep =
    options.mode === 'pilot'
      ? `          pnpm exec archora-forge pilot "$OPENAPI_SCHEMA" --base "$OPENAPI_BASE_REF" \\
            --repo . \\
            --out forge-pilot \\
            --skip-typecheck`
      : `          pnpm exec archora-forge impact "$OPENAPI_SCHEMA" --base "$OPENAPI_BASE_REF" \\
            --repo . \\
            --report markdown \\
            --report-file forge-impact.md \\
            --pr-comment-file forge-impact-pr.md`
  const artifactPath =
    options.mode === 'pilot'
      ? `            forge-pilot/**`
      : `            forge-impact.md
            forge-impact-pr.md`
  const blockStep =
    options.gate === 'block'
      ? `
      - name: Block merge on blocked API impact
        if: steps.forge.outcome == 'failure'
        run: |
          echo "Archora Forge reported blocked API impact. Review the PR comment and uploaded artifacts."
          exit 1`
      : ''

  return `name: archora-forge-impact

on:
  pull_request:
    paths:
      - '**/*.yaml'
      - '**/*.yml'
      - '**/*.json'

permissions:
  contents: read
  pull-requests: write

env:
  OPENAPI_SCHEMA: ${options.schema}
  OPENAPI_BASE_REF: ${options.base}
  FORGE_GATE_MODE: ${options.gate}

jobs:
  ${options.mode}:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4
        with:
          version: 9.15.4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Run Forge impact
        id: forge
        continue-on-error: true
        run: |
${runStep}

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: archora-forge-impact
          path: |
${artifactPath}

      - uses: thollander/actions-comment-pull-request@v3
        if: always() && env.OPENAPI_SCHEMA != '' && hashFiles('forge-impact-pr.md') != ''
        with:
          file-path: forge-impact-pr.md
          comment-tag: archora-forge-impact
${blockStep}
`
}
