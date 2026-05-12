# Customizable Output

Archora Forge keeps the default Vue module output, but teams can start customizing the generation surface through config.

```ts
import { defineForgeConfig } from '@archora/forge-config'

export default defineForgeConfig({
  input: './openapi.yaml',
  templates: {
    override: {
      table: './archora-templates/table.mjs',
      form: './archora-templates/form.mjs',
      page: './archora-templates/page.mjs',
    },
  },
  target: {
    framework: 'vue',
    ui: 'custom',
    architecture: 'feature-sliced',
  },
  uiAdapter: {
    imports: {
      Button: '@/shared/ui/Button.vue',
      Input: '@/shared/ui/Input.vue',
      Select: '@/shared/ui/Select.vue',
    },
    fields: {
      string: 'Input',
      enum: 'Select',
      boolean: 'Switch',
    },
    cells: {
      string: 'TextCell',
      enum: 'StatusBadge',
      boolean: 'BooleanBadge',
    },
  },
  naming: {
    generatedSuffix: '.generated',
    componentPrefix: '',
  },
})
```

Template overrides are JavaScript modules with a default render function. The function receives `{ cwd, resource, uiModel }` and returns generated file content.

Current vertical slice:

- default templates remain the fallback;
- table, form and page overrides are supported;
- missing or invalid template modules fail with readable errors;
- UI adapter, architecture and naming config are typed and documented as extension points.

The full design-system runtime layer is still intentionally small. Generated fallback UI remains the default path.
