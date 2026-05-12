import type { ForgeResourceConfig } from '@archora/forge-config'

import type { ResourceUiModel } from '../resourceUiModel.js'
import { toCode } from './serialization.js'

export function createPermissionsArtifact(resourceName: string, config?: ForgeResourceConfig): string {
  return `export const ${resourceName}Permissions = {\n  view: '${resourceName}.read',\n  create: '${resourceName}.create',\n  update: '${resourceName}.update',\n  delete: '${resourceName}.delete',\n} as const\n`
    .replace(`'${resourceName}.read'`, `'${config?.permissions?.view ?? `${resourceName}.read`}'`)
    .replace(`'${resourceName}.create'`, `'${config?.permissions?.create ?? `${resourceName}.create`}'`)
    .replace(`'${resourceName}.update'`, `'${config?.permissions?.update ?? `${resourceName}.update`}'`)
    .replace(`'${resourceName}.delete'`, `'${config?.permissions?.delete ?? `${resourceName}.delete`}'`)
}

export function createI18nArtifact(resourceName: string, entity: string, model: ResourceUiModel): string {
  const fields = [...model.formFields.map((field) => field.name), ...model.tableColumns.map((column) => column.name)]
  const uniqueFields = [...new Set(fields)]
    .map((field) => `    ${field}: '${field.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())}',`)
    .join('\n')

  return `export const ${resourceName}I18n = {\n  title: '${entity}s',\n  create: 'Create ${entity.toLowerCase()}',\n  edit: 'Edit ${entity.toLowerCase()}',\n  delete: 'Delete ${entity.toLowerCase()}',\n  fields: {\n${uniqueFields}\n  },\n} as const\n`
}

export function createResourceConfigArtifact(resourceName: string, model: ResourceUiModel): string {
  return `export const ${resourceName}Config = {\n  resource: '${resourceName}',\n  pagination: ${toCode(model.pagination)},\n  fields: ${toCode(model.formFields)},\n  columns: ${toCode(model.tableColumns)},\n} as const\n`
}

export function createRoutesArtifact(resourceName: string, entity: string): string {
  return `import { ${resourceName}Permissions } from '../../features/${resourceName}/model/${resourceName}.permissions'\n\nexport const ${resourceName}Routes = [{\n  path: '/${resourceName}',\n  name: '${resourceName}',\n  component: () => import('./${entity}sPage.generated.vue'),\n  meta: { permission: ${resourceName}Permissions.view },\n}] as const\n`
}
