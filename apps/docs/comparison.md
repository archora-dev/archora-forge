# Comparison With Client-only Generators

OpenAPI client generators are useful when the goal is API access. They usually stop at clients, types or request wrappers.

Forge is a narrower public-preview tool. It is best evaluated through a private beta or paid pilot on one real schema before any broader rollout.

Archora Forge targets a slightly higher layer:

```txt
OpenAPI + Resource Config = Frontend Resource Contract
```

Generated output includes:

- typed clients and query keys;
- operation helpers;
- generated resource metadata;
- form and table metadata;
- permissions and i18n scaffolds;
- mock fixtures, handlers and scenarios;
- regeneration and drift checks.

The goal is not to replace specialized SDK generators or UI kits. The goal is to turn API contracts into typed frontend contracts that teams can connect to their chosen framework.

## Before

Client-only generators usually give the frontend a method and leave the surrounding resource contract to each team:

```ts
const response = await api.getUsers({ page: 1 })
```

Teams still hand-write query keys, form metadata, table columns, permissions, mocks and drift checks.

## After

Forge keeps the transport layer but adds the resource contract around it:

```ts
import { usersClient } from './src/shared/api/generated/users/users.client'
import { usersQueryKeys } from './src/shared/api/generated/users/users.query-keys'
import { usersConfig } from './src/features/users/model/users.config'

const users = await usersClient.listUsers({ page: 1 })
const key = usersQueryKeys.list({ page: 1 })
const columns = usersConfig.columns
```

The generated output stays plain TypeScript. Product teams can bind it to React Query, Angular services, Vue composables, Svelte stores or an internal UI kit.
