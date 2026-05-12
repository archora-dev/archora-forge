<script setup lang="ts">
import OrdersTableGenerated from './OrdersTable.generated.vue'

defineProps<{
  rows?: Record<string, unknown>[]
  loading?: boolean
  error?: string | null
}>()
</script>

<template>
  <OrdersTableGenerated :rows="rows" :loading="loading" :error="error" />
</template>
