# Experimental Validation Generation

Status: experimental opt-in. Zod output is covered by generator tests and an isolated generated TypeScript typecheck with `zod` installed. It is not full request/response runtime validation.

Validation schemas are opt-in.

```ts
export default defineForgeConfig({
  input: './openapi.yaml',
  validation: 'zod',
})
```

When enabled, Forge emits files such as:

```txt
src/shared/api/generated/users/users.validation.ts
```

Current Zod mapping:

- required and optional object properties;
- nullable fields;
- string min/max and email;
- number min/max and integer;
- enum values;
- boolean fields;
- simple arrays;
- simple nested objects.

Install the validation library in the consumer app when enabled:

```bash
pnpm add zod
```

Valibot is reserved in the config shape, but the adapter is not implemented. Do not enable Valibot expecting usable schemas.
