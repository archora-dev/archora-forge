# Mocks

Each resource gets:

- `<resource>.fixtures.ts`
- `<resource>.handlers.ts`
- `<resource>.scenarios.ts`

Handlers include list, detail, create, validation error, forbidden and server error scaffolds.

Generated scenario variants include:

- `success-list`
- `empty-list`
- `detail-success`
- `create-success`
- `validation-error`
- `forbidden`
- `server-error`

The scenarios are starter fixtures. Application tests should add domain-specific states outside generated files.
