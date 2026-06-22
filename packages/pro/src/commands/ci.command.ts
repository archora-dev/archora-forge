import { readFile } from 'node:fs/promises'

import type { CAC } from 'cac'

import { requireCommercialLicense, writeReportFile, logger } from '@archora/forge-cli/internal'

type CiOptions = {
  force?: boolean
  output?: string
  mode?: string
  gate?: string
  schema?: string
  base?: string
  readme?: boolean
}

type WorkflowConfig = {
  mode: 'impact' | 'pilot'
  gate: 'block' | 'comment'
  schema: string
  base: string
}

const PROVIDERS = {
  github: {
    workflowPath: '.github/workflows/archora-forge-impact.yml',
    build: createGithubWorkflow,
  },
  gitlab: {
    workflowPath: '.gitlab/archora-forge-impact.yml',
    build: createGitlabWorkflow,
  },
} as const

type Provider = keyof typeof PROVIDERS

export function registerCiCommand(cli: CAC): void {
  cli
    .command('ci <action> <provider>', 'Scaffold a turnkey CI kit for Forge impact review')
    .option('--force', 'Overwrite an existing workflow file when its content differs')
    .option('--output <path>', 'Write the workflow to a custom path')
    .option('--mode <mode>', 'Workflow mode: impact or pilot')
    .option('--gate <mode>', 'Merge gate mode: block or comment')
    .option('--schema <path>', 'OpenAPI schema path inside the repository')
    .option('--base <ref>', 'Git base ref for the previous schema')
    .option('--no-readme', 'Skip writing the FORGE_CI.md handoff document')
    .action(async (action: string, provider: string, options: CiOptions) => {
      await requireCommercialLicense('ci')
      if (action !== 'init') throw new Error(`Unknown CI action "${action}". Use init.`)
      if (!isProvider(provider)) {
        throw new Error(`Unsupported CI provider "${provider}". Use github or gitlab.`)
      }

      const config: WorkflowConfig = {
        mode: normalizeMode(options.mode),
        gate: normalizeGate(options.gate),
        schema: options.schema ?? 'openapi.yaml',
        base: options.base ?? 'origin/main',
      }
      const target = PROVIDERS[provider]
      const workflowPath = options.output ?? target.workflowPath

      const workflowResult = await writeManaged(workflowPath, target.build(config), options.force)
      reportWrite(workflowPath, workflowResult)

      if (options.readme !== false) {
        const readmeResult = await writeManaged(
          'FORGE_CI.md',
          createHandoff(provider, config, workflowPath),
          options.force,
        )
        reportWrite('FORGE_CI.md', readmeResult)
      }

      logger.line(
        provider === 'gitlab'
          ? `Next: add \`include: { local: '${workflowPath}' }\` to your .gitlab-ci.yml.`
          : `Next: review OPENAPI_SCHEMA and OPENAPI_BASE_REF in ${workflowPath}.`,
      )
    })
}

type WriteResult = 'created' | 'updated' | 'unchanged' | 'skipped'

async function writeManaged(
  path: string,
  content: string,
  force: boolean | undefined,
): Promise<WriteResult> {
  const existing = await readFile(path, 'utf8').catch(() => null)
  if (existing === null) {
    await writeReportFile(path, content)
    return 'created'
  }
  if (existing === content) return 'unchanged'
  if (!force) return 'skipped'
  await writeReportFile(path, content)
  return 'updated'
}

function reportWrite(path: string, result: WriteResult): void {
  if (result === 'created') logger.success(`Created ${path}`)
  else if (result === 'updated') logger.success(`Updated ${path}`)
  else if (result === 'unchanged') logger.line(`${path} is already up to date`)
  else {
    logger.warn(`${path} already exists with different content`)
    logger.line('Re-run with --force to overwrite it.')
  }
}

function isProvider(value: string): value is Provider {
  return value === 'github' || value === 'gitlab'
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

function createGithubWorkflow(config: WorkflowConfig): string {
  const runStep =
    config.mode === 'pilot'
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
    config.mode === 'pilot'
      ? `            forge-pilot/**`
      : `            forge-impact.md
            forge-impact-pr.md`
  const blockStep =
    config.gate === 'block'
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
  OPENAPI_SCHEMA: ${config.schema}
  OPENAPI_BASE_REF: ${config.base}
  FORGE_GATE_MODE: ${config.gate}

jobs:
  ${config.mode}:
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

function createGitlabWorkflow(config: WorkflowConfig): string {
  const runCommand =
    config.mode === 'pilot'
      ? `pnpm exec archora-forge pilot "$OPENAPI_SCHEMA" --base "$OPENAPI_BASE_REF" --repo . --out forge-pilot --skip-typecheck`
      : `pnpm exec archora-forge impact "$OPENAPI_SCHEMA" --base "$OPENAPI_BASE_REF" --repo . --report markdown --report-file forge-impact.md --pr-comment-file forge-impact-pr.md`
  // In comment mode the job stays green and surfaces the report as an artifact; in block mode
  // the non-zero exit from a blocked impact fails the job and blocks the merge request.
  const script = config.gate === 'comment' ? `${runCommand} || true` : runCommand
  const artifacts =
    config.mode === 'pilot'
      ? `      - forge-pilot/`
      : `      - forge-impact.md
      - forge-impact-pr.md`

  return `# Include this file from your .gitlab-ci.yml:
#   include:
#     - local: '${PROVIDERS.gitlab.workflowPath}'

archora-forge-impact:
  stage: test
  image: node:22
  variables:
    OPENAPI_SCHEMA: ${config.schema}
    OPENAPI_BASE_REF: ${config.base}
    FORGE_GATE_MODE: ${config.gate}
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  before_script:
    - corepack enable
    - corepack prepare pnpm@9.15.4 --activate
    - git fetch origin "$OPENAPI_BASE_REF" || true
    - pnpm install --frozen-lockfile
  script:
    - ${script}
  artifacts:
    when: always
    expire_in: 1 week
    paths:
${artifacts}
`
}

function createHandoff(provider: Provider, config: WorkflowConfig, workflowPath: string): string {
  const gateLine =
    config.gate === 'block'
      ? 'The pipeline **blocks the merge** when Forge reports a blocked frontend API change.'
      : 'The pipeline stays green and posts the impact report as a **comment/artifact** for reviewers.'
  const unblock =
    config.gate === 'block'
      ? `## Temporarily unblock a merge

Set the gate to advisory and re-run \`archora-forge ci init ${provider} --gate comment --force\`,
or resolve the blocking change and push again.`
      : ''

  return `# Forge CI Kit

This repository runs Archora Forge in CI to review OpenAPI changes before they break frontend code.

- Provider: ${provider}
- Workflow: \`${workflowPath}\`
- Mode: ${config.mode}
- Gate: ${config.gate}
- Schema: \`${config.schema}\`
- Base ref: \`${config.base}\`

## What it does

On every ${provider === 'gitlab' ? 'merge request' : 'pull request'}, Forge compares the new OpenAPI
schema against \`${config.base}\` and reports the frontend impact: breaking changes, affected
generated files and a migration summary. ${gateLine}

## How to read it

- Open the \`archora-forge-impact\` artifact (\`forge-impact.md\`) for the full report.
- ${provider === 'gitlab' ? 'Review the impact artifact attached to the pipeline.' : 'Read the `forge-impact-pr.md` comment posted on the PR.'}
- A blocked decision means a breaking frontend contract change needs handling before merge.

${unblock}
To change schema path, base ref, mode or gate, re-run \`archora-forge ci init ${provider}\` with
the matching flags (add \`--force\` to overwrite).
`
}
