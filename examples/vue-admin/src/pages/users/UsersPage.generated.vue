<script setup lang="ts">
import { ref } from 'vue'

import UsersTable from '../../features/users/ui/UsersTable.vue'

const scenario = ref<'data' | 'loading' | 'empty' | 'error'>('data')
const demoRows = [
  {
    id: 'usr_1024',
    name: 'Mira Chen',
    email: 'mira.chen@example.com',
    status: 'active',
    age: 34,
    verified: true,
    createdAt: '2026-05-01T10:00:00.000Z',
    profile: {
      city: 'Berlin',
      timezone: 'Europe/Berlin',
    },
  },
  {
    id: 'usr_1025',
    name: 'Noah Patel',
    email: 'noah.patel@example.com',
    status: 'pending',
    age: 29,
    verified: false,
    createdAt: '2026-05-02T10:00:00.000Z',
    profile: {
      city: 'London',
      timezone: 'Europe/London',
    },
  },
]
</script>

<template>
  <section class="users-page">
    <nav class="users-page__scenarios" aria-label="User mock scenarios">
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

    <UsersTable
      :rows="scenario === 'empty' ? [] : demoRows"
      :loading="scenario === 'loading'"
      :error="scenario === 'error' ? 'Unable to load users right now.' : null"
    />
  </section>
</template>

<style scoped>
.users-page {
  display: grid;
  gap: 16px;
}

.users-page__scenarios {
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

.users-page__scenarios button {
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #93a4b8;
  padding: 6px 10px;
  cursor: pointer;
}

.users-page__scenarios button:hover {
  color: #e5edf7;
}

.users-page__scenarios button.is-active {
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(226, 232, 240, 0.92);
  color: #111827;
}
</style>
