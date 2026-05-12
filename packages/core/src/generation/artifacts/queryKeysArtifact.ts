import type { DetectedResource } from '../../resources/resources.types.js'
import { createResourceTypeNames, getPathParams } from '../typeGeneration.js'

export function createQueryKeysArtifact(resourceName: string, resource: DetectedResource): string {
  const names = createResourceTypeNames(resource)
  const requiresListParams = getPathParams(resource.operations.list).length > 0
  return `import type { ${names.idType}, ${names.listParamsType} } from './${resourceName}.types'\n\nexport const ${resourceName}QueryKeys = {\n  all: ['${resourceName}'] as const,\n  list: (params${requiresListParams ? '' : '?'}: ${names.listParamsType}) => [...${resourceName}QueryKeys.all, 'list', params] as const,\n  detail: (id: ${names.idType}) => [...${resourceName}QueryKeys.all, 'detail', id] as const,\n} as const\n`
}
