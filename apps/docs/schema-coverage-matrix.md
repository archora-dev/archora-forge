# Schema Coverage Matrix

The schema coverage matrix makes Forge support boundaries measurable. It is included in `check --json`, Markdown reports and HTML reports.

```bash
archora-forge check ./openapi.yaml --json
archora-forge check ./openapi.yaml --report html --report-file forge-check.html
```

## Matrix Fields

`coverage.operations.total` counts all normalized OpenAPI operations.

`coverage.operations.generated` counts operations that Forge can include in generated resource contracts.

`coverage.operations.diagnosticOnly` counts operations preserved for diagnostics but not generated as supported resource helpers.

`coverage.operations.byKind` groups operations by Forge operation kind:

- `crud-resource`
- `search-resource`
- `action-operation`
- `file-operation`
- `dashboard-resource`
- `read-only-resource`
- `unsupported-operation`

`coverage.operations.byRequestShape` and `coverage.operations.byResponseShape` group request and response bodies as `json`, `binary`, `text`, `form`, `multipart`, `non-json`, `missing` or `empty`.

`coverage.schemas.unsupportedConstructs` counts OpenAPI schema constructs that need review, such as `allOf`, `oneOf`, `anyOf` and `discriminator`.

Simple non-discriminated unions are generated as broad TypeScript unions where safe. Discriminator-heavy schemas remain visible in the matrix and diagnostics so teams can decide whether the shape is predictable enough for the current pilot scope.

`coverage.cases` gives the adoption-review summary:

- `generated`: generated operation cases;
- `skipped`: unsupported operation cases;
- `fallback`: generated cases that use broader request or response typing;
- `diagnosticOnly`: unsupported operations plus schema constructs reported for review.

## How To Use It

Use the matrix before broad adoption:

1. Check `operations.generated` against the number of endpoints expected in scope.
2. Review `byKind` to confirm non-CRUD endpoints are classified as expected.
3. Review `fallback` before relying on generated request or response types in forms.
4. Review `unsupportedConstructs` before accepting discriminator-heavy or composition-heavy schemas.
5. Decide whether diagnostic-only entries are outside pilot scope or need schema changes.

The matrix is intentionally conservative. A fallback does not mean generation failed; it means the generated type is broader than the OpenAPI author probably intended.
