# Multi-schema Workspace

Use `inputs` for monorepos or products that split OpenAPI contracts by service:

```ts
export default defineForgeConfig({
  inputs: [
    { name: 'users', path: './contracts/users.yaml' },
    { name: 'billing', path: './contracts/billing.yaml' },
  ],
})
```

Current status:

- single-schema `input` remains the simplest default;
- `archora-forge doctor --json`, `inspect --json`, `validate --json`, `lint --json`, `check --json`, `diff --json` and `generate --json` aggregate all configured `inputs` when no schema argument is passed;
- `check` reports per-input schema entries in `schemas`, including config path, health score, resources, generated/protected file counts, drift count, diagnostics count and failed checks;
- top-level `check` JSON still aggregates resources, generated files, protected files, drift, diagnostics and failed checks across all inputs;
- `diff` and `generate` include per-input `schemas` entries plus top-level aggregate file counts;
- top-level JSON keeps backward-compatible primary schema fields while `schemas` contains per-input detail.

Set a distinct `output.generatedDir` per input for generated artifacts. `generate` refuses multi-schema plans that would write the same generated path from more than one input.

For adoption review artifacts across all inputs, see [Workspace Report](/workspace-report).
