# Archora UI Adapter

Generated Vue components import controls from one stable local path:

```ts
import { ArchButton, ArchDataTable, ArchInput } from '../../../shared/ui/archora-ui'
```

When a real Archora UI package is not available, Forge emits a small Vue fallback module at `src/shared/ui/archora-ui.ts`. This keeps generated modules and demos runnable without a hard dependency on another repository.

When `target.ui = 'archora-ui'`, Forge emits that adapter as re-exports from `@archora/ui` instead of local fallback components:

```ts
export {
  ArchBadge,
  ArchButton,
  ArchDataTable,
  ArchDatePicker,
  ArchInput,
  ArchSelect,
  ArchSwitch,
  ArchTextarea,
} from '@archora/ui'
```

The generated modules keep importing the same local adapter path, so the design-system integration point is explicit and replaceable.

This mode is a beta integration point, not a verified production integration with a published `@archora/ui` package in this repository. Keep the fallback adapter for demos and enable `archora-ui` only in consumers that provide the package and typecheck the generated app.

Current adapter mappings include enum fields to selects, boolean fields to switches, date fields to date pickers, enum table cells to badges and object table cells to compact readable display.
