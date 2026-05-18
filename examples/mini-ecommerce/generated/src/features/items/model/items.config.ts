export const itemsConfig = {
  resource: 'items',
  pagination: {
    enabled: false,
  },
  fields: [
    {
      name: 'productId',
      label: 'Product Id',
      input: 'text',
      component: 'ArchInput',
      required: true,
      nullable: false,
      validation: {},
    },
    {
      name: 'quantity',
      label: 'Quantity',
      input: 'number',
      component: 'ArchInput',
      required: true,
      nullable: false,
      defaultValue: 1,
      validation: {
        minimum: 1,
      },
    },
  ],
  filters: [],
  columns: [],
} as const
