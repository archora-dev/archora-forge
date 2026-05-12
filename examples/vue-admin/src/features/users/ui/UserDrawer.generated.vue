<script setup lang="ts">
import UserFormGenerated from './UserForm.generated.vue'

defineProps<{ open: boolean }>()
</script>

<template>
  <aside v-if="open">
    <UserFormGenerated />
  </aside>
</template>
