export const membersConfig = {
  resource: 'members',
  pagination: {
    enabled: false,
  },
  fields: [
    {
      name: 'id',
      label: 'Id',
      input: 'text',
      component: 'ArchInput',
      required: false,
      nullable: false,
      validation: {},
    },
  ],
  filters: [
    {
      name: 'id',
      label: 'Id',
      input: 'text',
      component: 'ArchInput',
      required: false,
      nullable: false,
      validation: {},
    },
  ],
  columns: [
    {
      name: 'id',
      label: 'Id',
      cell: 'text',
      sortable: true,
      nullable: false,
    },
  ],
} as const
