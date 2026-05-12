import { defineComponent, h, type PropType } from 'vue'

type OptionValue = string | number
type ModelValue = string | number | boolean | null | undefined

export const ArchInput = defineComponent({
  name: 'ArchInput',
  props: {
    name: String,
    modelValue: null as unknown as PropType<ModelValue>,
    type: {
      type: String,
      default: 'text',
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('input', {
        class: 'arch-input',
        name: props.name,
        type: props.type,
        value: props.modelValue ?? '',
        onInput: (event: Event) =>
          emit('update:modelValue', (event.target as HTMLInputElement).value),
      })
  },
})

export const ArchTextarea = defineComponent({
  name: 'ArchTextarea',
  props: {
    name: String,
    modelValue: null as unknown as PropType<ModelValue>,
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('textarea', {
        class: 'arch-textarea',
        name: props.name,
        value: props.modelValue ?? '',
        onInput: (event: Event) =>
          emit('update:modelValue', (event.target as HTMLTextAreaElement).value),
      })
  },
})

export const ArchSwitch = defineComponent({
  name: 'ArchSwitch',
  props: {
    name: String,
    modelValue: Boolean,
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('input', {
        checked: props.modelValue,
        class: 'arch-switch',
        name: props.name,
        type: 'checkbox',
        onChange: (event: Event) =>
          emit('update:modelValue', (event.target as HTMLInputElement).checked),
      })
  },
})

export const ArchSelect = defineComponent({
  name: 'ArchSelect',
  props: {
    name: String,
    modelValue: null as unknown as PropType<ModelValue>,
    options: {
      type: Array as PropType<readonly OptionValue[]>,
      default: () => [],
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h(
        'select',
        {
          class: 'arch-select',
          name: props.name,
          value: props.modelValue ?? '',
          onChange: (event: Event) =>
            emit('update:modelValue', (event.target as HTMLSelectElement).value),
        },
        props.options.map((option) => h('option', { value: option }, String(option))),
      )
  },
})

export const ArchDatePicker = defineComponent({
  name: 'ArchDatePicker',
  props: {
    name: String,
    modelValue: null as unknown as PropType<ModelValue>,
    type: {
      type: String,
      default: 'date',
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('input', {
        class: 'arch-date-picker',
        name: props.name,
        type: props.type,
        value: props.modelValue ?? '',
        onInput: (event: Event) =>
          emit('update:modelValue', (event.target as HTMLInputElement).value),
      })
  },
})

export const ArchButton = defineComponent({
  name: 'ArchButton',
  setup(_, { attrs, slots }) {
    return () => h('button', { class: 'arch-button', ...attrs }, slots.default?.())
  },
})

export const ArchBadge = defineComponent({
  name: 'ArchBadge',
  setup(_, { slots }) {
    return () => h('span', { class: 'arch-badge' }, slots.default?.())
  },
})

export const ArchDataTable = defineComponent({
  name: 'ArchDataTable',
  props: {
    rows: {
      type: Array as PropType<readonly Record<string, unknown>[]>,
      default: () => [],
    },
    columns: {
      type: Array as PropType<readonly Record<string, unknown>[]>,
      default: () => [],
    },
  },
  setup(_, { slots }) {
    return () => h('div', { class: 'arch-data-table' }, slots.default?.())
  },
})
