export type PermissionsTemplateInput = {
  resourceName: string
  permissions: Record<'view' | 'create' | 'update' | 'delete', string>
}

export function createPermissionsTemplate(input: PermissionsTemplateInput): string {
  const exportName = `${input.resourceName}Permissions`

  return `export const ${exportName} = ${JSON.stringify(input.permissions, null, 2)} as const\n`
}
