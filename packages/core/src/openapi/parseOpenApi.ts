import { readFile } from 'node:fs/promises'

import { parse as parseYaml } from 'yaml'

import { ForgeError } from '../errors/ForgeError.js'
import type { OpenApiDocument } from './openapi.types.js'

export type ParseOpenApiOptions = {
  fetchImpl?: typeof fetch
  headers?: Record<string, string>
  timeoutMs?: number
}

export async function parseOpenApi(filePath: string, options: ParseOpenApiOptions = {}): Promise<OpenApiDocument> {
  const loaded = isRemoteInput(filePath) ? await fetchOpenApiSource(filePath, options) : await readOpenApiSource(filePath)

  const value = parseOpenApiSource(loaded.source, filePath, loaded.kind)
  if (!isOpenApiDocument(value)) {
    throw new ForgeError(`Invalid OpenAPI document: ${filePath}`, {
      reason: 'The document does not contain a valid OpenAPI 3.x version.',
      suggestion: 'Add an `openapi: 3.x.x` field at the document root.',
    })
  }

  return value
}

async function readOpenApiSource(filePath: string): Promise<{ source: string; kind: 'json' | 'yaml' }> {
  const source = await readFile(filePath, 'utf8').catch((error: unknown) => {
    throw new ForgeError(`Failed to read OpenAPI schema: ${filePath}`, {
      reason: error instanceof Error ? error.message : 'Unknown file system error',
      suggestion: 'Check that the schema path exists and is readable.',
    })
  })

  return { source, kind: filePath.endsWith('.json') ? 'json' : 'yaml' }
}

async function fetchOpenApiSource(filePath: string, options: ParseOpenApiOptions): Promise<{ source: string; kind: 'json' | 'yaml' }> {
  const fetchImpl = options.fetchImpl ?? fetch
  const controller = new AbortController()
  const timeoutReason = options.timeoutMs ? `Request timed out after ${options.timeoutMs}ms` : undefined
  const timeout = timeoutReason ? setTimeout(() => controller.abort(new DOMException(timeoutReason, 'TimeoutError')), options.timeoutMs) : undefined

  try {
    const response = await fetchImpl(filePath, {
      headers: options.headers,
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new ForgeError(`Failed to fetch OpenAPI schema: ${filePath}`, {
        reason: `${response.status} ${response.statusText}`.trim(),
        suggestion: 'Check the remote schema URL, credentials and server availability.',
      })
    }

    const contentType = response.headers.get('content-type') ?? ''
    return {
      source: await response.text(),
      kind: contentType.includes('json') || filePath.endsWith('.json') ? 'json' : 'yaml',
    }
  } catch (error) {
    if (error instanceof ForgeError) throw error
    const reason = error instanceof Error ? error.message : 'Unknown network error'
    throw new ForgeError(`Failed to fetch OpenAPI schema: ${filePath}${reason ? ` (${reason})` : ''}`, {
      reason,
      suggestion: 'Check the remote schema URL, network access and configured request headers.',
    })
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

function parseOpenApiSource(source: string, filePath: string, kind: 'json' | 'yaml'): unknown {
  try {
    if (kind === 'json') {
      return JSON.parse(source)
    }

    return parseYaml(source)
  } catch (error) {
    throw new ForgeError(`Failed to parse OpenAPI schema: ${filePath}`, {
      reason: error instanceof Error ? error.message : 'Unknown parse error',
      suggestion: 'Use valid JSON or YAML syntax.',
    })
  }
}

function isRemoteInput(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://')
}

function isOpenApiDocument(value: unknown): value is OpenApiDocument {
  return (
    typeof value === 'object' &&
    value !== null &&
    'openapi' in value &&
    typeof value.openapi === 'string' &&
    value.openapi.startsWith('3.')
  )
}
