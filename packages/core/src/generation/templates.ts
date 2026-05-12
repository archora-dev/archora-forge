import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

import type { ResourceUiModel } from './resourceUiModel.js'
import type { DetectedResource } from '../resources/resources.types.js'

export type TemplateContext = {
  cwd: string
}

export type ResourceTemplateContext = TemplateContext & {
  resource: DetectedResource
  uiModel: ResourceUiModel
}

export type FileTemplate = (context: ResourceTemplateContext) => string | Promise<string>

export type TemplateRenderer = {
  render: FileTemplate
}

export type TemplateRegistry = Partial<Record<'table' | 'form' | 'page' | 'permissions' | 'i18n', FileTemplate>>

export async function loadTemplateOverride(path: string, cwd: string): Promise<FileTemplate> {
  const absolutePath = resolve(cwd, path)
  let loaded: unknown
  try {
    loaded = await import(pathToFileURL(absolutePath).href)
  } catch (error) {
    throw new Error(`Failed to load template override "${path}": ${error instanceof Error ? error.message : String(error)}`)
  }
  const candidate = typeof loaded === 'object' && loaded !== null && 'default' in loaded ? (loaded as { default: unknown }).default : loaded
  if (typeof candidate !== 'function') {
    throw new Error(`Template override "${path}" must export a default render function.`)
  }

  return candidate as FileTemplate
}
