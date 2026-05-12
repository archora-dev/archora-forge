<script setup lang="ts">
import OrderFormGenerated from './OrderForm.generated.vue'

defineProps<{ open: boolean }>()
</script>

<template>
  <aside v-if="open">
    <OrderFormGenerated />
  </aside>
</template>
