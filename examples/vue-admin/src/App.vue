<script setup lang="ts">
import { computed, ref } from 'vue'

import OrdersPageGenerated from './pages/orders/OrdersPage.generated.vue'
import ReportsPageGenerated from './pages/reports/ReportsPage.generated.vue'
import UsersPageGenerated from './pages/users/UsersPage.generated.vue'

const resources = [
  {
    key: 'users',
    label: 'Users',
    summary: 'Typed CRUD module with schema-driven table, form metadata and protected wrapper.',
    files: '26 files',
    status: 'CRUD',
    endpoints: '5 operations',
    schema: 'Paginated User response',
    generatedPath: 'src/features/users',
  },
  {
    key: 'orders',
    label: 'Orders',
    summary: 'Generated operations, table states, permissions, i18n and mock scenarios.',
    files: '26 files',
    status: 'CRUD',
    endpoints: '5 operations',
    schema: 'Paginated Order response',
    generatedPath: 'src/features/orders',
  },
  {
    key: 'reports',
    label: 'Reports',
    summary: 'Partial resource detected from the same contract and generated safely.',
    files: '15 files',
    status: 'List',
    endpoints: '1 operation',
    schema: 'Report list response',
    generatedPath: 'src/features/reports',
  },
] as const

type ResourceKey = (typeof resources)[number]['key']

const artifacts = ['Types', 'Client', 'Composables', 'Table', 'Form', 'Page', 'Permissions', 'i18n', 'Mocks']

const generationStats = [
  { label: 'Resources', value: '3' },
  { label: 'Total generated files', value: '67' },
  { label: 'Protected wrappers', value: '3' },
  { label: 'Schema health', value: 'Good' },
]

const fileTreeByResource: Record<ResourceKey, string[]> = {
  users: [
    'api/generated/users/users.types.ts',
    'api/generated/users/users.client.ts',
    'features/users/api/useUsersQuery.ts',
    'features/users/ui/UsersTable.generated.vue',
    'pages/users/UsersPage.generated.vue',
  ],
  orders: [
    'api/generated/orders/orders.types.ts',
    'api/generated/orders/orders.client.ts',
    'features/orders/api/useOrdersQuery.ts',
    'features/orders/ui/OrdersTable.generated.vue',
    'pages/orders/OrdersPage.generated.vue',
  ],
  reports: [
    'api/generated/reports/reports.types.ts',
    'api/generated/reports/reports.client.ts',
    'features/reports/api/useReportsQuery.ts',
    'features/reports/ui/ReportsTable.generated.vue',
    'pages/reports/ReportsPage.generated.vue',
  ],
}

const activeResource = ref<ResourceKey>('users')

const activeMeta = computed(
  () => resources.find((resource) => resource.key === activeResource.value) ?? resources[0],
)

const activeFileTree = computed(() => fileTreeByResource[activeResource.value])
</script>

<template>
  <main class="app-shell">
    <aside class="app-rail" aria-label="Generated resources">
      <div class="app-brand">
        <span class="app-brand__mark">AF</span>
        <div>
          <p>Archora Forge</p>
          <strong>Frontend module generator</strong>
        </div>
      </div>

      <nav class="resource-nav">
        <button
          v-for="resource in resources"
          :key="resource.key"
          :class="[
            'resource-nav__item',
            { 'resource-nav__item--active': resource.key === activeResource },
          ]"
          type="button"
          @click="activeResource = resource.key"
        >
          <span>
            <strong>{{ resource.label }}</strong>
            <small>{{ resource.endpoints }}</small>
          </span>
          <em>{{ resource.status }}</em>
        </button>
      </nav>

      <section class="rail-summary" aria-label="Generation summary">
        <p>Generation summary</p>
        <strong>Local OpenAPI → modules</strong>
        <span>inspect · diff · generate · preview</span>
      </section>
    </aside>

    <section class="demo-workspace">
      <header class="demo-header">
        <div>
          <p class="demo-header__eyebrow">OpenAPI contract → frontend module</p>
          <h1>Archora Forge gives you a frontend module.</h1>
          <p class="demo-header__copy">
            Typed clients, composables, forms, tables, pages, permissions, i18n and mocks generated
            from one contract.
          </p>
        </div>
        <div class="demo-header__meta">
          <span>{{ activeMeta.files }}</span>
          <strong>{{ activeMeta.label }}</strong>
        </div>
      </header>

      <section class="metrics-grid" aria-label="Generated output metrics">
        <div v-for="stat in generationStats" :key="stat.label" class="metric-card">
          <span>{{ stat.label }}</span>
          <strong>{{ stat.value }}</strong>
        </div>
      </section>

      <section class="screenshot-grid">
        <section class="generated-panel" :aria-label="`${activeMeta.label} generated module`">
          <div class="panel-label">
            <span>Generated UI preview</span>
            <strong>{{ activeMeta.generatedPath }}</strong>
          </div>
          <UsersPageGenerated v-if="activeResource === 'users'" />
          <OrdersPageGenerated v-else-if="activeResource === 'orders'" />
          <ReportsPageGenerated v-else />
        </section>

        <aside class="inspector-panel" aria-label="Generated module details">
          <section class="detail-card">
            <p class="detail-card__label">Schema resource</p>
            <strong>{{ activeMeta.label }}</strong>
            <span>{{ activeMeta.schema }} · {{ activeMeta.summary }}</span>
          </section>

          <section class="detail-card">
            <p class="detail-card__label">Generated artifacts</p>
            <div class="artifact-list">
              <span v-for="artifact in artifacts" :key="artifact">{{ artifact }}</span>
            </div>
          </section>

          <section class="detail-card detail-card--code">
            <p class="detail-card__label">Generated file tree</p>
            <code v-for="file in activeFileTree" :key="file">{{ file }}</code>
          </section>

          <section class="detail-card detail-card--code">
            <p class="detail-card__label">CLI flow</p>
            <code>$ archora-forge inspect openapi.yaml</code>
            <code>$ archora-forge diff openapi.yaml</code>
            <code>$ archora-forge generate openapi.yaml</code>
          </section>
        </aside>
      </section>
    </section>
  </main>
</template>
