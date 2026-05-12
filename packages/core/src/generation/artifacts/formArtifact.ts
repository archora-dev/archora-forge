import type { ResourceUiModel } from '../resourceUiModel.js'
import { toCode } from './serialization.js'

export function createFormArtifact(entity: string, model: ResourceUiModel): string {
  return `<script setup lang="ts">
import { ref, watch } from 'vue'

import {
  ArchButton,
  ArchDatePicker,
  ArchInput,
  ArchSelect,
  ArchSwitch,
  ArchTextarea,
} from '../../../shared/ui/archora-ui'

type ModelValue = string | number | boolean | null | undefined
type FormModel = Record<string, ModelValue>
type FormField = {
  name: string
  label: string
  input: 'text' | 'email' | 'number' | 'switch' | 'select' | 'date' | 'dateTime' | 'password' | 'textarea'
  component: string
  required: boolean
  nullable: boolean
  enumValues?: readonly string[]
  hint?: string
  validation: {
    minLength?: number
    maxLength?: number
    minimum?: number
    maximum?: number
  }
}

const props = withDefaults(
  defineProps<{
    modelValue?: FormModel
    submitting?: boolean
    onSubmit?: (value: FormModel) => void | Promise<void>
  }>(),
  {
    modelValue: () => ({}),
    submitting: false,
    onSubmit: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: FormModel]
  submit: [value: FormModel]
}>()

const formFields: readonly FormField[] = ${toCode(model.formFields)}
const formModel = ref<FormModel>({ ...props.modelValue })
const fieldComponents = {
  ArchDatePicker,
  ArchInput,
  ArchSelect,
  ArchSwitch,
  ArchTextarea,
} as const

watch(
  () => props.modelValue,
  (value) => {
    formModel.value = { ...(value ?? {}) }
  },
  { deep: true },
)

function resolveFieldComponent(field: FormField) {
  return fieldComponents[field.component as keyof typeof fieldComponents] ?? ArchInput
}

function updateField(name: string, value: ModelValue) {
  formModel.value = { ...formModel.value, [name]: value }
  emit('update:modelValue', { ...formModel.value })
}

async function submitForm() {
  emit('submit', { ...formModel.value })
  await props.onSubmit?.({ ...formModel.value })
}
</script>

<template>
  <form class="${entity.toLowerCase()}-form" @submit.prevent="submitForm">
    <label v-for="field in formFields" :key="field.name" class="${entity.toLowerCase()}-form__field">
      <span>
        {{ field.label }}
        <strong v-if="field.required" aria-label="required">*</strong>
      </span>
      <component
        :is="resolveFieldComponent(field)"
        :model-value="formModel[field.name]"
        :name="field.name"
        :type="field.input === 'dateTime' ? 'datetime-local' : field.input"
        :options="field.enumValues"
        @update:model-value="(value: unknown) => updateField(field.name, value as ModelValue)"
      />
      <small v-if="field.hint">{{ field.hint }}</small>
    </label>

    <footer class="${entity.toLowerCase()}-form__footer">
      <ArchButton type="submit" :disabled="props.submitting">
        {{ props.submitting ? 'Saving...' : 'Save ${entity.toLowerCase()}' }}
      </ArchButton>
    </footer>
  </form>
</template>

<style scoped>
.${entity.toLowerCase()}-form {
  display: grid;
  gap: 14px;
}

.${entity.toLowerCase()}-form__field {
  display: grid;
  gap: 6px;
}

.${entity.toLowerCase()}-form__field span {
  font-size: 13px;
  font-weight: 600;
}

.${entity.toLowerCase()}-form__field input,
.${entity.toLowerCase()}-form__field select {
  min-height: 38px;
  border: 1px solid #c9ced6;
  border-radius: 6px;
  padding: 8px 10px;
}

.${entity.toLowerCase()}-form__field small {
  color: #5f6368;
}

.${entity.toLowerCase()}-form__footer {
  display: flex;
  justify-content: flex-end;
}

.${entity.toLowerCase()}-form__footer button {
  border: 1px solid #1f6feb;
  border-radius: 6px;
  background: #1f6feb;
  color: #ffffff;
  padding: 8px 14px;
}
</style>
`
}
