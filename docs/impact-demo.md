# Frontend impact demo

The hero of the Pro tier: when an OpenAPI change lands, Forge tells you **what breaks
in the frontend that consumes it** — down to the file and line — and posts it as a PR
comment that can block the merge.

## Run it

```bash
pnpm build
pnpm impact:demo
```

The demo takes the petstore schema behind `examples/react-query`, removes the
`/pets/{petId}` endpoint (a breaking change), and runs `archora-forge impact` against
the example app. It prints the exact PR comment a CI run would post.

## What it shows

```
## Frontend API Impact

Merge decision: block
Merge risk: high
Reason: 3 breaking frontend contract changes detected.
...
## Source Usage

- `src/usage.tsx:5,8,31,32`: useDeletePetMutation, useUpdatePetMutation
- `generated/.../pets.client.ts:...`: deletePet, getPet, petsClient
```

The `src/usage.tsx` line is the point: hand-written application code that uses the
generated hooks is flagged with exact line numbers, not just the regenerated output.
Matching is by whole identifier (a token like `getPet` does not match `getPetById`),
and covers both the generated client methods and the entity-based generated hooks
(`usePetQuery`, `useDeletePetMutation`, …) that consumers actually import.

## In CI

`archora-forge ci init github` generates a workflow that runs this on every PR that
touches the schema, uploads the report, posts the comment, and (in `--gate block`
mode) fails the check when the impact is blocked. See `forge-impact-pr.md` artifact.
