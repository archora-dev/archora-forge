// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.0","schemaHash":"66e8f461600e","configHash":"f1d971045876"}
export const productsHandlers = {
  list: () => ({ status: 200, body: [] }),
  detail: () => ({ status: 200, body: {} }),
  create: () => ({ status: 201, body: {} }),
  validationError: () => ({ status: 422, body: { message: 'Validation error' } }),
  forbidden: () => ({ status: 403, body: { message: 'Forbidden' } }),
  serverError: () => ({ status: 500, body: { message: 'Server error' } }),
} as const
