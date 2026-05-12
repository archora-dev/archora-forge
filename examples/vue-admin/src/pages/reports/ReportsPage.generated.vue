<script setup lang="ts">
import { ref } from 'vue'

import ReportsTable from '../../features/reports/ui/ReportsTable.vue'

const scenario = ref<'data' | 'loading' | 'empty' | 'error'>('data')
const demoRows = [
  {
    id: 'rep_1024',
    title: 'Revenue quality report',
    status: 'ready',
    generatedAt: '2026-05-01T10:00:00.000Z',
    owner: 'Data Platform',
    rows: 34,
  },
  {
    id: 'rep_1025',
    title: 'Regional adoption report',
    status: 'processing',
    generatedAt: '2026-05-02T10:00:00.000Z',
    owner: 'RevOps',
    rows: 29,
  },
]
</script>

<template>
  <section class="reports-page">
    <nav class="reports-page__scenarios" aria-label="Report mock scenarios">
      <button
        type="button"
        :class="{ 'is-active': scenario === 'data' }"
        @click="scenario = 'data'"
      >
        Data
      </button>
      <button
        type="button"
        :class="{ 'is-active': scenario === 'loading' }"
        @click="scenario = 'loading'"
      >
        Loading
      </button>
      <button
        type="button"
        :class="{ 'is-active': scenario === 'empty' }"
        @click="scenario = 'empty'"
      >
        Empty
      </button>
      <button
        type="button"
        :class="{ 'is-active': scenario === 'error' }"
        @click="scenario = 'error'"
      >
        Error
      </button>
    </nav>

    <ReportsTable
      :rows="scenario === 'empty' ? [] : demoRows"
      :loading="scenario === 'loading'"
      :error="scenario === 'error' ? 'Unable to load reports right now.' : null"
    />
  </section>
</template>

<style scoped>
.reports-page {
  display: grid;
  gap: 16px;
}

.reports-page__scenarios {
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

.reports-page__scenarios button {
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #93a4b8;
  padding: 6px 10px;
  cursor: pointer;
}

.reports-page__scenarios button:hover {
  color: #e5edf7;
}

.reports-page__scenarios button.is-active {
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(226, 232, 240, 0.92);
  color: #111827;
}
</style>
