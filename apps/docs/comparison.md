# Comparison With Client-only Generators

OpenAPI client generators are useful when the goal is API access. They usually stop at clients, types or query wrappers.

Archora Forge targets a different layer:

```txt
OpenAPI + Resource Config + UI Adapter = Frontend Module
```

That means generated output includes:

- feature folders;
- typed clients and query keys;
- Vue composables;
- generated/custom separation;
- pages and routes;
- forms and tables from schemas;
- permissions and i18n scaffolds;
- mock fixtures, handlers and scenarios;
- regeneration-safe wrappers.

The goal is not to replace specialized SDK generators. The goal is to turn API contracts into maintainable frontend slices that teams can customize safely.
