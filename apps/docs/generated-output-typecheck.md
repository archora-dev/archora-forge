# Generated Output Typecheck

Generation alone is not enough for a commercial evaluation. The generated output should compile in a temporary TypeScript workspace before a buyer treats it as usable.

`archora-forge audit` runs this gate automatically when TypeScript is available:

```bash
archora-forge audit ./openapi.yaml --out forge-audit
```

Use the manual setup below when you need to reproduce the gate outside the audit package.

## Why This Gate Exists

The typecheck catches issues that schema validation cannot see:

- unsafe generated identifiers;
- conflicting type aliases;
- invalid object keys;
- request/response aliases that reference the wrong type name;
- helper functions that call query keys with invalid params.

## Minimal Workspace

Create a temporary workspace outside the application source tree:

```txt
generated-output-typecheck/
  package.json
  tsconfig.json
  src/
    generated/
```

Copy the generated output into `src/generated`.

Example `package.json`:

```json
{
  "private": true,
  "type": "module",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.9.0"
  }
}
```

Example `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

Run:

```bash
pnpm install
pnpm typecheck
```

## Report Format

Record the result in a short Markdown artifact:

```md
# Generated Output Typecheck

- Schema: <schema-name-or-redacted-label>
- Generated files: <count>
- Command: `pnpm typecheck`
- Result: pass/fail
- Failures: <none or summary>
- Decision: accept/block/fix-generator/fix-schema
```

## Acceptance Rule

For purchase evaluation, generated TypeScript should pass typecheck or every failure should be mapped to one of:

- schema issue;
- known Forge limitation;
- generator defect;
- integration dependency missing from the temporary workspace.

Untriaged TypeScript failures should block adoption.
