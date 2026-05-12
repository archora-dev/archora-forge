<script setup lang="ts">
import ReportFormGenerated from './ReportForm.generated.vue'

defineProps<{ open: boolean }>()
</script>

<template>
  <aside v-if="open">
    <ReportFormGenerated />
  </aside>
</template>
