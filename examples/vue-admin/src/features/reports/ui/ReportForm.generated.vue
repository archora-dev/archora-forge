<script setup lang="ts">
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
  input:
    | 'text'
    | 'email'
    | 'number'
    | 'switch'
    | 'select'
    | 'date'
    | 'dateTime'
    | 'password'
    | 'textarea'
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

const formFields: readonly FormField[] = [
  {
    name: 'title',
    label: 'Title',
    input: 'text',
    component: 'ArchInput',
    required: true,
    nullable: false,
    validation: {},
  },
  {
    name: 'status',
    label: 'Status',
    input: 'select',
    component: 'ArchSelect',
    required: true,
    nullable: false,
    enumValues: ['ready', 'processing', 'failed'],
    validation: {},
  },
  {
    name: 'generatedAt',
    label: 'Generated At',
    input: 'dateTime',
    component: 'ArchDatePicker',
    required: true,
    nullable: false,
    validation: {},
  },
  {
    name: 'owner',
    label: 'Owner',
    input: 'text',
    component: 'ArchInput',
    required: false,
    nullable: false,
    validation: {},
  },
  {
    name: 'rows',
    label: 'Rows',
    input: 'number',
    component: 'ArchInput',
    required: false,
    nullable: false,
    validation: {
      minimum: 0,
    },
  },
]
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
  <form class="report-form" @submit.prevent="submitForm">
    <label v-for="field in formFields" :key="field.name" class="report-form__field">
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

    <footer class="report-form__footer">
      <ArchButton type="submit" :disabled="props.submitting">
        {{ props.submitting ? 'Saving...' : 'Save report' }}
      </ArchButton>
    </footer>
  </form>
</template>

<style scoped>
.report-form {
  display: grid;
  gap: 14px;
}

.report-form__field {
  display: grid;
  gap: 6px;
}

.report-form__field span {
  font-size: 13px;
  font-weight: 600;
}

.report-form__field input,
.report-form__field select {
  min-height: 38px;
  border: 1px solid #c9ced6;
  border-radius: 6px;
  padding: 8px 10px;
}

.report-form__field small {
  color: #5f6368;
}

.report-form__footer {
  display: flex;
  justify-content: flex-end;
}

.report-form__footer button {
  border: 1px solid #1f6feb;
  border-radius: 6px;
  background: #1f6feb;
  color: #ffffff;
  padding: 8px 14px;
}
</style>
