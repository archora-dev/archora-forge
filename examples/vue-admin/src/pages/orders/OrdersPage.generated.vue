<script setup lang="ts">
import { ref } from 'vue'

import OrdersTable from '../../features/orders/ui/OrdersTable.vue'

const scenario = ref<'data' | 'loading' | 'empty' | 'error'>('data')
const demoRows = [
  {
    id: 'ord_1024',
    number: 'ORD-1024',
    status: 'paid',
    total: 12840,
    paid: true,
    dueDate: '2026-05-01T10:00:00.000Z',
    customer: 'Northwind Labs',
  },
  {
    id: 'ord_1025',
    number: 'ORD-1025',
    status: 'draft',
    total: 9400,
    paid: false,
    dueDate: '2026-05-02T10:00:00.000Z',
    customer: 'Acme Cloud',
  },
]
</script>

<template>
  <section class="orders-page">
    <nav class="orders-page__scenarios" aria-label="Order mock scenarios">
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

    <OrdersTable
      :rows="scenario === 'empty' ? [] : demoRows"
      :loading="scenario === 'loading'"
      :error="scenario === 'error' ? 'Unable to load orders right now.' : null"
    />
  </section>
</template>

<style scoped>
.orders-page {
  display: grid;
  gap: 16px;
}

.orders-page__scenarios {
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

.orders-page__scenarios button {
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #93a4b8;
  padding: 6px 10px;
  cursor: pointer;
}

.orders-page__scenarios button:hover {
  color: #e5edf7;
}

.orders-page__scenarios button.is-active {
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(226, 232, 240, 0.92);
  color: #111827;
}
</style>
