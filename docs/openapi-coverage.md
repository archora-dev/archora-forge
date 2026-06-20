# OpenAPI coverage

How Archora Forge models OpenAPI schema constructs today. The table is honest about
what is fully generated, partially generated, or surfaced as a diagnostic instead of
a guessed shape. Every row is backed by a test so the matrix tracks real behaviour.

Legend:

- **Supported** — generated as a precise TypeScript type (and validator, where applicable).
- **Partial** — generated, but with a documented narrowing/loss.
- **Diagnostic-only** — not modeled; reported as a diagnostic and excluded from the
  generated shape rather than emitted as a wrong type.

| Construct                                                         | Status          | Notes                                                                                                                                              | Test                                                                   |
| ----------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Primitives (`string`, `number`, `integer`, `boolean`)             | Supported       | Including `string` formats (`email`, `uuid`, `uri`, `date`, `date-time`) and numeric/length constraints in validators.                             | `test/typed-output.test.ts`, `test/validation-generation.test.ts`      |
| `enum` / `const`                                                  | Supported       | Rendered as literal unions / literal types.                                                                                                        | `test/typed-output.test.ts`                                            |
| `object` with `properties` + `required`                           | Supported       | Optional vs required honored; `readOnly`/`writeOnly` split by request/response.                                                                    | `test/typed-output.test.ts`                                            |
| `additionalProperties` (dictionaries)                             | Supported       | Rendered as `Record<string, T>` / index signatures.                                                                                                | `test/typed-output.test.ts`                                            |
| `array`                                                           | Supported       | Element type resolved recursively.                                                                                                                 | `test/typed-output.test.ts`                                            |
| `nullable: true` (OAS 3.0) and `type: [..., 'null']` (OAS 3.1)    | Supported       | Adds a `\| null` union member consistently in types and validators.                                                                                | `test/composition-coverage.test.ts`                                    |
| `allOf` (non-conflicting object branches, incl. `$ref`)           | Supported       | Merged into a single object during normalization.                                                                                                  | `test/composition-coverage.test.ts`, `test/product-regression.test.ts` |
| `allOf` (annotation-only wrapper, e.g. `[$ref, { description }]`) | Supported       | Unwrapped transparently.                                                                                                                           | `test/product-regression.test.ts`                                      |
| `allOf` (conflicting branches)                                    | Diagnostic-only | Reported as `conflicting-allof`; not merged.                                                                                                       | `test/product-regression.test.ts`                                      |
| `oneOf` / `anyOf` (renderable branches)                           | Supported       | Generated as a real TypeScript union and `z.union` / `v.union`.                                                                                    | `test/composition-coverage.test.ts`                                    |
| `discriminator` over object branches                              | Supported       | Generated as a discriminated union; each `$ref` branch is pinned to its literal discriminant (from `mapping`, else the schema name) so it narrows. | `test/discriminated-union.test.ts`                                     |
| `discriminator` over scalar branches                              | Diagnostic-only | Reported as `unsupported-discriminator` / `unsupported-oneof`; the union still renders but cannot narrow.                                          | `test/discriminated-union.test.ts`                                     |
| Validation schemas (`zod`, `valibot`)                             | Supported       | Objects, optional/required, formats, constraints, `enum`, arrays, records, unions, nullable, and recursive `$ref` (with cycle guard).              | `test/validation-generation.test.ts`                                   |

The schema-coverage matrix (`forge check --json` → `coverage.schemas.unsupportedConstructs`)
counts only the **Diagnostic-only** rows, so adoption reviews see what actually falls
back rather than every occurrence of a composition keyword.
