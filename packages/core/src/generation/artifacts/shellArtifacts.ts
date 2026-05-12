export function createDrawerArtifact(entity: string): string {
  return `<script setup lang="ts">\nimport ${entity}FormGenerated from './${entity}Form.generated.vue'\n\ndefineProps<{ open: boolean }>()\n</script>\n\n<template>\n  <aside v-if="open">\n    <${entity}FormGenerated />\n  </aside>\n</template>\n`
}

export function createDeleteConfirmArtifact(entity: string): string {
  return `<template>\n  <section>Delete ${entity.toLowerCase()}?</section>\n</template>\n`
}
