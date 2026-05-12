# Preview Versioning

Archora Forge uses Changesets-style preview notes, but this branch does not publish packages.

Preview release rules:

- keep package versions in sync for CLI/core/config/runtime;
- publish only from an approved release branch;
- do not publish production-ready claims;
- run `pnpm release:check` and inspect `pnpm pack` contents before tagging;
- use prerelease versions such as `0.2.0-preview.0` until API stability is declared.

The root `changeset:version` script is a guard/documented equivalent for this preview branch. Add `@changesets/cli` and run `changeset version` only when the project is ready to cut an actual preview tag.
