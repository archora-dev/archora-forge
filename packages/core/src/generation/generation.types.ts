import type { ResolvedResource } from '../resources/resources.types.js'

export type GeneratedFileKind = 'generated' | 'custom'

export type GeneratedFile = {
  path: string
  content: string
  kind: GeneratedFileKind
  overwrite: boolean
  exists?: boolean
}

export type GenerationPlan = {
  resources: ResolvedResource[]
  files: GeneratedFile[]
}

export type GeneratorContext = {
  rootDir: string
  dryRun: boolean
  force: boolean
}
