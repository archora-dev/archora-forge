<script setup lang="ts">
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

const tableColumns: readonly TableColumn[] = [
  {
    name: 'id',
    label: 'Id',
    cell: 'text',
    sortable: true,
    nullable: false,
  },
  {
    name: 'number',
    label: 'Number',
    cell: 'text',
    sortable: true,
    nullable: false,
  },
  {
    name: 'status',
    label: 'Status',
    cell: 'badge',
    sortable: true,
    nullable: false,
  },
  {
    name: 'total',
    label: 'Total',
    cell: 'number',
    sortable: true,
    nullable: false,
  },
  {
    name: 'paid',
    label: 'Paid',
    cell: 'boolean',
    sortable: false,
    nullable: false,
  },
  {
    name: 'dueDate',
    label: 'Due Date',
    cell: 'date',
    sortable: true,
    nullable: false,
  },
  {
    name: 'customer',
    label: 'Customer',
    cell: 'json',
    sortable: false,
    nullable: false,
  },
]
const pagination: PaginationConfig = {
  enabled: true,
  itemsPath: 'items',
  totalPath: 'total',
  pagePath: 'page',
}
const hasRowActions = true

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
    .split(/[-_\s]+/)
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
  const preferred = ['name', 'title', 'label'].find(
    (key) => typeof record[key] === 'string' && record[key],
  )
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
  <section class="orders-module">
    <header class="orders-module__header">
      <div>
        <p class="orders-module__eyebrow">Order management</p>
        <h2>Orders</h2>
      </div>
      <button class="orders-module__primary" type="button">Create order</button>
    </header>

    <div v-if="props.loading" class="orders-module__state">Loading orders...</div>
    <div v-else-if="props.error" class="orders-module__state orders-module__state--error">
      {{ props.error }}
    </div>
    <div v-else-if="props.rows.length === 0" class="orders-module__state">No orders found</div>

    <ArchDataTable v-else :rows="props.rows" :columns="tableColumns" class="orders-table">
      <table>
        <thead>
          <tr>
            <th v-for="column in tableColumns" :key="column.name">
              {{ column.label }}
            </th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in props.rows" :key="row.id ? String(row.id) : rowIndex">
            <td v-for="column in tableColumns" :key="column.name">
              <ArchBadge v-if="column.cell === 'badge' || column.cell === 'boolean'">
                {{ formatCellValue(row, column) }}
              </ArchBadge>
              <span v-else :class="['orders-table__cell', `orders-table__cell--${column.cell}`]">
                {{ formatCellValue(row, column) }}
              </span>
            </td>
            <td v-if="hasRowActions" class="orders-table__actions">
              <ArchButton type="button">Edit</ArchButton>
              <ArchButton type="button">Delete</ArchButton>
            </td>
          </tr>
        </tbody>
      </table>
    </ArchDataTable>

    <footer v-if="pagination.enabled" class="orders-module__pagination">
      <span>Page 1 of 1</span>
      <span>{{ props.rows.length }} {{ props.rows.length === 1 ? 'record' : 'records' }}</span>
    </footer>
  </section>
</template>

<style scoped>
.orders-module {
  display: grid;
  gap: 16px;
  color: #e5edf7;
}

.orders-module__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.orders-module__eyebrow {
  margin: 0 0 4px;
  color: #8ea4bc;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

.orders-module__header h2 {
  margin: 0;
  color: #f8fafc;
  font-size: 22px;
}

.orders-module__primary,
.orders-table__actions button {
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

.orders-module__primary {
  border-color: rgba(34, 197, 94, 0.48);
  background: rgba(34, 197, 94, 0.16);
  color: #dcfce7;
}

.orders-module__primary:hover,
.orders-table__actions button:hover {
  border-color: rgba(125, 211, 252, 0.55);
  background: rgba(14, 165, 233, 0.14);
  color: #f8fafc;
}

.orders-module__state {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.62);
  color: #cbd5e1;
  padding: 24px;
}

.orders-module__state--error {
  border-color: rgba(248, 113, 113, 0.36);
  background: rgba(127, 29, 29, 0.22);
  color: #fecaca;
}

.orders-table table {
  width: 100%;
  overflow: hidden;
  border-collapse: collapse;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.62);
}

.orders-table th,
.orders-table td {
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  padding: 12px;
  text-align: left;
}

.orders-table th {
  color: #93a4b8;
  font-size: 12px;
  font-weight: 700;
}

.orders-table td {
  color: #dbe4ef;
  font-size: 13px;
}

.orders-table tbody tr:hover {
  background: rgba(148, 163, 184, 0.06);
}

.orders-table__cell--number,
.orders-table__cell--date,
.orders-table__cell--dateTime {
  color: #b8c7d9;
}

.orders-table__cell--json {
  color: #d6e4f0;
}

.orders-table :deep(.arch-badge) {
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

.orders-table__actions {
  display: flex;
  gap: 8px;
}

.orders-module__pagination {
  display: flex;
  justify-content: space-between;
  color: #93a4b8;
  font-size: 13px;
}
</style>
