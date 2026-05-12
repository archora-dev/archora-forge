# Experimental Multi-schema Workspace Foundation

The config shape reserves `inputs` for future multi-schema workspaces:

```ts
export default defineForgeConfig({
  input: './openapi.yaml',
  inputs: [
    { name: 'users', path: './contracts/users.yaml' },
    { name: 'billing', path: './contracts/billing.yaml' },
  ],
})
```

Current status:

- single-schema flow remains the supported default;
- config typing accepts `inputs`, but runtime behavior still uses single `input`;
- CLI orchestration across all schemas and service-specific output namespaces are not complete.

Do not promise collision-free multi-service generation until CLI and generator orchestration are finished.
