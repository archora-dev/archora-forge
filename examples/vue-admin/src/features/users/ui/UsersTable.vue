<script setup lang="ts">
import UsersTableGenerated from './UsersTable.generated.vue'

defineProps<{
  rows?: Record<string, unknown>[]
  loading?: boolean
  error?: string | null
}>()
</script>

<template>
  <UsersTableGenerated :rows="rows" :loading="loading" :error="error" />
</template>
