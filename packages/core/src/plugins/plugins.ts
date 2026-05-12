import type { ForgeDiagnostic } from '../diagnostics/diagnostics.js'
import type { GeneratedFile } from '../generation/generation.types.js'
import type { NormalizedOpenApi } from '../openapi/openapi.types.js'

export type ForgePluginArtifact = Pick<GeneratedFile, 'path' | 'content' | 'kind' | 'overwrite'>

export type ForgePlugin = {
  name: string
  version?: string
  diagnostics?: (normalized: NormalizedOpenApi) => ForgeDiagnostic[] | Promise<ForgeDiagnostic[]>
  generateArtifacts?: (input: { normalized: NormalizedOpenApi; cwd: string }) => ForgePluginArtifact[] | Promise<ForgePluginArtifact[]>
  afterGenerate?: (files: GeneratedFile[]) => void | Promise<void>
}

export function normalizePlugins(plugins: unknown[] | undefined): ForgePlugin[] {
  return (plugins ?? []).filter(isForgePlugin)
}

export async function runPluginArtifactHooks(input: {
  plugins: unknown[] | undefined
  normalized: NormalizedOpenApi
  cwd: string
}): Promise<ForgePluginArtifact[]> {
  const artifacts: ForgePluginArtifact[] = []
  for (const plugin of normalizePlugins(input.plugins)) {
    if (!plugin.generateArtifacts) continue
    try {
      artifacts.push(...(await plugin.generateArtifacts({ normalized: input.normalized, cwd: input.cwd })))
    } catch (error) {
      throw new Error(
        `Plugin "${plugin.name}" failed during generateArtifacts: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  return artifacts
}

export async function runPluginAfterGenerateHooks(input: { plugins: unknown[] | undefined; files: GeneratedFile[] }): Promise<void> {
  for (const plugin of normalizePlugins(input.plugins)) {
    if (!plugin.afterGenerate) continue
    await plugin.afterGenerate(input.files)
  }
}

export function runPluginDiagnostics(input: { plugins: unknown[] | undefined; normalized: NormalizedOpenApi }): ForgeDiagnostic[] {
  const diagnostics: ForgeDiagnostic[] = []
  for (const plugin of normalizePlugins(input.plugins)) {
    if (!plugin.diagnostics) continue
    try {
      const result = plugin.diagnostics(input.normalized)
      if (Array.isArray(result)) diagnostics.push(...result)
    } catch (error) {
      diagnostics.push({
        severity: 'error',
        code: 'plugin-diagnostic-error',
        message: `Plugin "${plugin.name}" failed while collecting diagnostics.`,
        location: `plugins.${plugin.name}`,
        suggestion: error instanceof Error ? error.message : 'Inspect the plugin diagnostics hook.',
      })
    }
  }

  return diagnostics
}

function isForgePlugin(value: unknown): value is ForgePlugin {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string'
  )
}
