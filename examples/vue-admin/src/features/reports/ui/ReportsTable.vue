<script setup lang="ts">
import ReportsTableGenerated from './ReportsTable.generated.vue'

defineProps<{
  rows?: Record<string, unknown>[]
  loading?: boolean
  error?: string | null
}>()
</script>

<template>
  <ReportsTableGenerated :rows="rows" :loading="loading" :error="error" />
</template>
