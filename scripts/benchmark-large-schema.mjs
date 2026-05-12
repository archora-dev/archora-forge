import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'

import {
  createGenerationPlan,
  detectResources,
  normalizeOpenApi,
  parseOpenApi,
} from '../packages/core/dist/index.js'
import { resolveForgeConfig } from '../packages/config/dist/index.js'

const fixture = process.argv[2] ?? 'test/fixtures/openapi/large-synthetic.yaml'
const cwd = mkdtempSync(join(tmpdir(), 'archora-forge-benchmark-'))

try {
  const parseStart = performance.now()
  const document = await parseOpenApi(fixture)
  const parseMs = performance.now() - parseStart

  const normalizeStart = performance.now()
  const normalized = normalizeOpenApi(document)
  const normalizeMs = performance.now() - normalizeStart

  const detectStart = performance.now()
  const resources = detectResources(normalized.operations)
  const detectMs = performance.now() - detectStart

  const generationStart = performance.now()
  const plan = await createGenerationPlan({
    config: resolveForgeConfig({ input: fixture }),
    normalized,
    resources,
    cwd,
  })
  const generationMs = performance.now() - generationStart

  console.log(
    JSON.stringify(
      {
        fixture,
        endpoints: normalized.operations.length,
        schemas: normalized.schemas.length,
        resources: resources.length,
        files: plan.files.length,
        timingsMs: {
          parse: Math.round(parseMs),
          normalize: Math.round(normalizeMs),
          detect: Math.round(detectMs),
          generationPlan: Math.round(generationMs),
        },
      },
      null,
      2,
    ),
  )
} finally {
  rmSync(cwd, { recursive: true, force: true })
}
