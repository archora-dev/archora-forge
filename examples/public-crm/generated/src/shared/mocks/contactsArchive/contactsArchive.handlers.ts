// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.2","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
export const contactsArchiveHandlers = {
  list: () => ({ status: 200, body: [] }),
  detail: () => ({ status: 200, body: {} }),
  create: () => ({ status: 201, body: {} }),
  validationError: () => ({ status: 422, body: { message: 'Validation error' } }),
  forbidden: () => ({ status: 403, body: { message: 'Forbidden' } }),
  serverError: () => ({ status: 500, body: { message: 'Server error' } }),
} as const
