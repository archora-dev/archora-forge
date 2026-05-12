# Experimental Validation Generation

Status: experimental opt-in. Zod and Valibot output are covered by generator tests and isolated generated TypeScript typechecks with the selected validation library installed. This is not full request/response runtime validation.

Validation schemas are opt-in.

```ts
export default defineForgeConfig({
  input: './openapi.yaml',
  validation: 'zod',
})
```

Use `validation: 'valibot'` to emit Valibot schemas instead.

When enabled, Forge emits files such as:

```txt
src/shared/api/generated/users/users.validation.ts
```

Current validation mapping:

- required and optional object properties;
- nullable fields;
- OpenAPI 3.1 nullable type arrays such as `type: ['string', 'null']`;
- string min/max, email, uuid, uri, date and date-time;
- number min/max and integer;
- enum values;
- `const` literal values;
- numeric and boolean enum literals;
- simple non-discriminated `oneOf` and `anyOf` unions;
- boolean fields;
- simple arrays;
- simple nested objects;
- pure dictionary objects using `additionalProperties`.
- recursive `$ref` cycles are guarded with a lazy fallback so generation does not crash.

Install the validation library in the consumer app when enabled:

```bash
pnpm add zod
# or
pnpm add valibot
```

Recursive OpenAPI components are currently handled conservatively. Forge validates the fields it can resolve safely, and replaces the recursive edge with `z.lazy(() => z.unknown())` for Zod or `v.lazy(() => v.unknown())` for Valibot. This keeps generated code typecheckable while avoiding infinite schema expansion. Full named recursive schemas are planned after the contract generator stabilizes.
