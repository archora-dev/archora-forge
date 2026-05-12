import type { DetectedResource } from '../../resources/resources.types.js'
import type { ResourceUiModel } from '../resourceUiModel.js'
import { toCode } from './serialization.js'

export function createTableArtifact(entity: string, resourceName: string, model: ResourceUiModel, resource: DetectedResource): string {
  if (resource.kind !== 'crud-resource') {
    return createOperationPanelArtifact(resourceName, resource)
  }

  const hasCreate = Boolean(resource.operations.create?.id)
  const hasUpdate = Boolean(resource.operations.update?.id)
  const hasDelete = Boolean(resource.operations.delete?.id)
  const hasRowActions = hasUpdate || hasDelete

  return `<script setup lang="ts">
import { ArchBadge, ArchButton, ArchDataTable } from '../../../shared/ui/archora-ui'

type TableRow = Record<string, unknown>
type TableColumn = {
  name: string
  label: string
  cell: 'text' | 'number' | 'boolean' | 'badge' | 'date' | 'dateTime' | 'json'
  sortable: boolean
  nullable: boolean
  hint?: string
}

type PaginationConfig = {
  enabled: boolean
  itemsPath?: string
  totalPath?: string
  pagePath?: string
}

const props = withDefaults(
  defineProps<{
    rows?: TableRow[]
    loading?: boolean
    error?: string | null
  }>(),
  {
    rows: () => [],
    loading: false,
    error: null,
  },
)

const tableColumns: readonly TableColumn[] = ${toCode(model.tableColumns)}
const pagination: PaginationConfig = ${toCode(model.pagination)}
const hasRowActions = ${hasRowActions}

function formatNullableValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

function formatBooleanValue(value: unknown): string {
  return value ? 'Yes' : 'No'
}

function formatDateValue(value: unknown, withTime = false): string {
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return formatNullableValue(value)
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' } : {}),
  }).format(date)
}

function formatEnumValue(value: unknown): string {
  return formatNullableValue(value)
    .split(/[-_\\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatNumberValue(value: unknown): string {
  const numberValue = Number(value)
  if (Number.isNaN(numberValue)) return formatNullableValue(value)
  return new Intl.NumberFormat('en').format(numberValue)
}

function formatNestedValue(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return formatNullableValue(value)
  const record = value as Record<string, unknown>
  const preferred = ['name', 'title', 'label'].find((key) => typeof record[key] === 'string' && record[key])
  if (preferred) return String(record[preferred])
  if (typeof record.city === 'string' && typeof record.timezone === 'string') {
    return String(record.city) + ' / ' + String(record.timezone)
  }
  if (record.id !== null && record.id !== undefined) return '#' + String(record.id)
  const fieldCount = Object.keys(record).length
  return String(fieldCount) + ' ' + (fieldCount === 1 ? 'field' : 'fields')
}

function formatCellValue(row: TableRow, column: (typeof tableColumns)[number]): string {
  const value = row[column.name]
  if (value === null || value === undefined || value === '') return formatNullableValue(value)
  if (column.cell === 'boolean') return formatBooleanValue(value)
  if (column.cell === 'badge') return formatEnumValue(value)
  if (column.cell === 'date') return formatDateValue(value)
  if (column.cell === 'dateTime') return formatDateValue(value, true)
  if (column.cell === 'number') return formatNumberValue(value)
  if (column.cell === 'json') return formatNestedValue(value)
  return formatNullableValue(value)
}
</script>

<template>
  <section class="${resourceName}-module">
    <header class="${resourceName}-module__header">
      <div>
        <p class="${resourceName}-module__eyebrow">${entity} management</p>
        <h2>${entity}s</h2>
      </div>
      ${hasCreate ? `<button class="${resourceName}-module__primary" type="button">Create ${entity.toLowerCase()}</button>` : ''}
    </header>

    <div v-if="props.loading" class="${resourceName}-module__state">Loading ${resourceName}...</div>
    <div v-else-if="props.error" class="${resourceName}-module__state ${resourceName}-module__state--error">{{ props.error }}</div>
    <div v-else-if="props.rows.length === 0" class="${resourceName}-module__state">No ${resourceName} found</div>

    <ArchDataTable v-else :rows="props.rows" :columns="tableColumns" class="${resourceName}-table">
      <table>
        <thead>
          <tr>
            <th v-for="column in tableColumns" :key="column.name">
              {{ column.label }}
            </th>
            ${hasRowActions ? '<th aria-label="Actions" />' : ''}
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in props.rows" :key="row.id ? String(row.id) : rowIndex">
            <td v-for="column in tableColumns" :key="column.name">
              <ArchBadge v-if="column.cell === 'badge' || column.cell === 'boolean'">
                {{ formatCellValue(row, column) }}
              </ArchBadge>
              <span v-else :class="['${resourceName}-table__cell', \`${resourceName}-table__cell--\${column.cell}\`]">
                {{ formatCellValue(row, column) }}
              </span>
            </td>
            <td v-if="hasRowActions" class="${resourceName}-table__actions">
              ${hasUpdate ? '<ArchButton type="button">Edit</ArchButton>' : ''}
              ${hasDelete ? '<ArchButton type="button">Delete</ArchButton>' : ''}
            </td>
          </tr>
        </tbody>
      </table>
    </ArchDataTable>

    <footer v-if="pagination.enabled" class="${resourceName}-module__pagination">
      <span>Page 1 of 1</span>
      <span>{{ props.rows.length }} {{ props.rows.length === 1 ? 'record' : 'records' }}</span>
    </footer>
  </section>
</template>

<style scoped>
.${resourceName}-module {
  display: grid;
  gap: 16px;
  color: #e5edf7;
}

.${resourceName}-module__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.${resourceName}-module__eyebrow {
  margin: 0 0 4px;
  color: #8ea4bc;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

.${resourceName}-module__header h2 {
  margin: 0;
  color: #f8fafc;
  font-size: 22px;
}

.${resourceName}-module__primary,
.${resourceName}-table__actions button {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 7px;
  background: rgba(15, 23, 42, 0.84);
  color: #dbeafe;
  padding: 8px 12px;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    color 160ms ease;
}

.${resourceName}-module__primary {
  border-color: rgba(34, 197, 94, 0.48);
  background: rgba(34, 197, 94, 0.16);
  color: #dcfce7;
}

.${resourceName}-module__primary:hover,
.${resourceName}-table__actions button:hover {
  border-color: rgba(125, 211, 252, 0.55);
  background: rgba(14, 165, 233, 0.14);
  color: #f8fafc;
}

.${resourceName}-module__state {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.62);
  color: #cbd5e1;
  padding: 24px;
}

.${resourceName}-module__state--error {
  border-color: rgba(248, 113, 113, 0.36);
  background: rgba(127, 29, 29, 0.22);
  color: #fecaca;
}

.${resourceName}-table table {
  width: 100%;
  overflow: hidden;
  border-collapse: collapse;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.62);
}

.${resourceName}-table th,
.${resourceName}-table td {
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  padding: 12px;
  text-align: left;
}

.${resourceName}-table th {
  color: #93a4b8;
  font-size: 12px;
  font-weight: 700;
}

.${resourceName}-table td {
  color: #dbe4ef;
  font-size: 13px;
}

.${resourceName}-table tbody tr:hover {
  background: rgba(148, 163, 184, 0.06);
}

.${resourceName}-table__cell--number,
.${resourceName}-table__cell--date,
.${resourceName}-table__cell--dateTime {
  color: #b8c7d9;
}

.${resourceName}-table__cell--json {
  color: #d6e4f0;
}

.${resourceName}-table :deep(.arch-badge) {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border: 1px solid rgba(34, 197, 94, 0.26);
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.12);
  color: #bbf7d0;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 700;
}

.${resourceName}-table__actions {
  display: flex;
  gap: 8px;
}

.${resourceName}-module__pagination {
  display: flex;
  justify-content: space-between;
  color: #93a4b8;
  font-size: 13px;
}
</style>
`
}

function createOperationPanelArtifact(resourceName: string, resource: DetectedResource): string {
  const title = operationPanelTitle(resource.kind)
  const primaryOperation = resource.operationsList[0]
  const operations = resource.operationsList.map((operation) => `${operation.method.toUpperCase()} ${operation.path}`).join('\n')
  const fallbackOperation = `${primaryOperation?.method.toUpperCase() ?? 'UNKNOWN'} ${primaryOperation?.path ?? resourceName}`

  return `<template>
  <section class="${resourceName}-operation-panel">
    <header>
      <p>${title}</p>
      <h2>${resourceName}</h2>
    </header>
    <p class="${resourceName}-operation-panel__summary">${operationPanelSummary(resource.kind)}</p>
    <button type="button" ${resource.kind === 'unsupported-operation' ? 'disabled' : ''}>${operationPanelButton(resource.kind)}</button>
    <pre>${operations || fallbackOperation}</pre>
  </section>
</template>

<style scoped>
.${resourceName}-operation-panel {
  display: grid;
  gap: 14px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.62);
  color: #dbe4ef;
  padding: 18px;
}

.${resourceName}-operation-panel header p {
  margin: 0 0 4px;
  color: #93a4b8;
  font-size: 13px;
  font-weight: 700;
}

.${resourceName}-operation-panel header h2 {
  margin: 0;
  color: #f8fafc;
  font-size: 22px;
}

.${resourceName}-operation-panel__summary {
  margin: 0;
  color: #cbd5e1;
}

.${resourceName}-operation-panel button {
  width: max-content;
  border: 1px solid rgba(125, 211, 252, 0.45);
  border-radius: 7px;
  background: rgba(14, 165, 233, 0.14);
  color: #f8fafc;
  padding: 8px 12px;
}

.${resourceName}-operation-panel button:disabled {
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(148, 163, 184, 0.12);
  color: #94a3b8;
}

.${resourceName}-operation-panel pre {
  overflow: auto;
  margin: 0;
  border-radius: 6px;
  background: rgba(2, 6, 23, 0.42);
  padding: 12px;
  color: #cbd5e1;
}
</style>
`
}

function operationPanelTitle(kind: DetectedResource['kind']): string {
  if (kind === 'search-resource') return 'Search operation'
  if (kind === 'dashboard-resource' || kind === 'read-only-resource') return 'Read-only operation'
  if (kind === 'action-operation') return 'Action operation'
  if (kind === 'file-operation') return 'File operation'
  return 'Unsupported operation'
}

function operationPanelSummary(kind: DetectedResource['kind']): string {
  if (kind === 'search-resource') return 'Mock search form and results preview should be generated for this operation family.'
  if (kind === 'dashboard-resource' || kind === 'read-only-resource') return 'Read-only data should be presented as summary cards or table previews.'
  if (kind === 'action-operation') return 'This endpoint should be shown as an action card with request fields and a mock run button.'
  if (kind === 'file-operation') return 'File and binary endpoints require custom upload/download handling and explicit limitations.'
  return 'This operation is preserved, but interactive generation is not supported yet.'
}

function operationPanelButton(kind: DetectedResource['kind']): string {
  if (kind === 'search-resource') return 'Search mock'
  if (kind === 'file-operation') return 'Choose file mock'
  if (kind === 'dashboard-resource' || kind === 'read-only-resource') return 'Refresh mock'
  if (kind === 'action-operation') return 'Run mock'
  return 'Unsupported'
}
