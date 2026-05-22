export function createFixturesArtifact(resourceName: string, entity: string): string {
  return `export const ${resourceName}Fixtures: ${entity}Fixture[] = []\n\ntype ${entity}Fixture = Record<string, unknown>\n`
}

export function createHandlersArtifact(resourceName: string): string {
  return `export const ${resourceName}Handlers = {\n  list: () => ({ status: 200, body: [] }),\n  detail: () => ({ status: 200, body: {} }),\n  create: () => ({ status: 201, body: {} }),\n  validationError: () => ({ status: 422, body: { message: 'Validation error' } }),\n  forbidden: () => ({ status: 403, body: { message: 'Forbidden' } }),\n  serverError: () => ({ status: 500, body: { message: 'Server error' } }),\n} as const\n`
}

export function createScenariosArtifact(resourceName: string): string {
  return `export const ${resourceName}Scenarios = ['success-list', 'empty-list', 'detail-success', 'create-success', 'validation-error', 'forbidden', 'server-error'] as const\n`
}
