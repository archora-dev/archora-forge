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
    name: 'number',
    label: 'Number',
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
    enumValues: ['draft', 'paid', 'shipped'],
    validation: {},
  },
  {
    name: 'total',
    label: 'Total',
    input: 'number',
    component: 'ArchInput',
    required: true,
    nullable: false,
    validation: {
      minimum: 0,
    },
  },
  {
    name: 'paid',
    label: 'Paid',
    input: 'switch',
    component: 'ArchSwitch',
    required: false,
    nullable: false,
    validation: {},
  },
  {
    name: 'dueDate',
    label: 'Due Date',
    input: 'date',
    component: 'ArchDatePicker',
    required: false,
    nullable: false,
    validation: {},
  },
  {
    name: 'customer',
    label: 'Customer',
    input: 'text',
    component: 'ArchInput',
    required: false,
    nullable: false,
    validation: {},
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
  <form class="order-form" @submit.prevent="submitForm">
    <label v-for="field in formFields" :key="field.name" class="order-form__field">
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

    <footer class="order-form__footer">
      <ArchButton type="submit" :disabled="props.submitting">
        {{ props.submitting ? 'Saving...' : 'Save order' }}
      </ArchButton>
    </footer>
  </form>
</template>

<style scoped>
.order-form {
  display: grid;
  gap: 14px;
}

.order-form__field {
  display: grid;
  gap: 6px;
}

.order-form__field span {
  font-size: 13px;
  font-weight: 600;
}

.order-form__field input,
.order-form__field select {
  min-height: 38px;
  border: 1px solid #c9ced6;
  border-radius: 6px;
  padding: 8px 10px;
}

.order-form__field small {
  color: #5f6368;
}

.order-form__footer {
  display: flex;
  justify-content: flex-end;
}

.order-form__footer button {
  border: 1px solid #1f6feb;
  border-radius: 6px;
  background: #1f6feb;
  color: #ffffff;
  padding: 8px 14px;
}
</style>
