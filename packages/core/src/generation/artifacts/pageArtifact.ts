import type { ResourceTableColumn, ResourceUiModel } from '../resourceUiModel.js'
import { toCode } from './serialization.js'

export function createPageArtifact(entity: string, resourceName: string, model: ResourceUiModel): string {
  return `<script setup lang="ts">
import { ref } from 'vue'

import ${entity}sTable from '../../features/${resourceName}/ui/${entity}sTable.vue'

const scenario = ref<'data' | 'loading' | 'empty' | 'error'>('data')
const demoRows = ${toCode([createDemoRow(model.tableColumns, entity, 1), createDemoRow(model.tableColumns, entity, 2)])}
</script>

<template>
  <section class="${resourceName}-page">
    <nav class="${resourceName}-page__scenarios" aria-label="${entity} mock scenarios">
      <button type="button" :class="{ 'is-active': scenario === 'data' }" @click="scenario = 'data'">Data</button>
      <button type="button" :class="{ 'is-active': scenario === 'loading' }" @click="scenario = 'loading'">Loading</button>
      <button type="button" :class="{ 'is-active': scenario === 'empty' }" @click="scenario = 'empty'">Empty</button>
      <button type="button" :class="{ 'is-active': scenario === 'error' }" @click="scenario = 'error'">Error</button>
    </nav>

    <${entity}sTable
      :rows="scenario === 'empty' ? [] : demoRows"
      :loading="scenario === 'loading'"
      :error="scenario === 'error' ? 'Unable to load ${resourceName} right now.' : null"
    />
  </section>
</template>

<style scoped>
.${resourceName}-page {
  display: grid;
  gap: 16px;
}

.${resourceName}-page__scenarios {
  display: inline-flex;
  width: max-content;
  max-width: 100%;
  flex-wrap: wrap;
  gap: 4px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.78);
  padding: 4px;
}

.${resourceName}-page__scenarios button {
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #93a4b8;
  padding: 6px 10px;
  cursor: pointer;
}

.${resourceName}-page__scenarios button:hover {
  color: #e5edf7;
}

.${resourceName}-page__scenarios button.is-active {
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(226, 232, 240, 0.92);
  color: #111827;
}
</style>
`
}

function createDemoRow(columns: ResourceTableColumn[], entity: string, index: number): Record<string, unknown> {
  const entityPrefix = entity === 'User' ? 'usr' : entity === 'Order' ? 'ord' : entity === 'Report' ? 'rep' : entity.slice(0, 3).toLowerCase()
  return Object.fromEntries(
    columns.map((column) => {
      const fieldName = column.name.toLowerCase()
      if (fieldName === 'id') return [column.name, `${entityPrefix}_${1023 + index}`]
      if (fieldName.includes('email')) return [column.name, index === 1 ? 'mira.chen@example.com' : 'noah.patel@example.com']
      if (fieldName === 'name') return [column.name, index === 1 ? 'Mira Chen' : 'Noah Patel']
      if (fieldName === 'number') return [column.name, index === 1 ? 'ORD-1024' : 'ORD-1025']
      if (fieldName.includes('title')) return [column.name, index === 1 ? 'Revenue quality report' : 'Regional adoption report']
      if (fieldName.includes('owner')) return [column.name, index === 1 ? 'Data Platform' : 'RevOps']
      if (fieldName.includes('customer')) return [column.name, index === 1 ? 'Northwind Labs' : 'Acme Cloud']
      if (fieldName.includes('amount')) return [column.name, index === 1 ? 12840 : 9400]
      if (fieldName.includes('total')) return [column.name, index === 1 ? 12840 : 9400]
      if (column.cell === 'badge') {
        if (entity === 'Order') return [column.name, index === 1 ? 'paid' : 'draft']
        if (entity === 'Report') return [column.name, index === 1 ? 'ready' : 'processing']
        return [column.name, index === 1 ? 'active' : 'pending']
      }
      if (column.cell === 'boolean') return [column.name, index === 1]
      if (column.cell === 'number') return [column.name, index === 1 ? 34 : 29]
      if (column.cell === 'date' || column.cell === 'dateTime') return [column.name, `2026-05-0${index}T10:00:00.000Z`]
      if (column.cell === 'json') {
        return [column.name, index === 1 ? { city: 'Berlin', timezone: 'Europe/Berlin' } : { city: 'London', timezone: 'Europe/London' }]
      }
      return [column.name, `${entity} ${index}`]
    }),
  )
}
