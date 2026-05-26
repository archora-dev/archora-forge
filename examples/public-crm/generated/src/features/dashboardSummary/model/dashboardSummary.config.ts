// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.2","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
export const dashboardSummaryConfig = {
  resource: 'dashboardSummary',
  pagination: {
    enabled: false,
  },
  fields: [
    {
      name: 'activeContacts',
      label: 'Active Contacts',
      input: 'number',
      component: 'ArchInput',
      required: true,
      nullable: false,
      validation: {},
    },
    {
      name: 'openCompanies',
      label: 'Open Companies',
      input: 'number',
      component: 'ArchInput',
      required: true,
      nullable: false,
      validation: {},
    },
    {
      name: 'conversionRate',
      label: 'Conversion Rate',
      input: 'number',
      component: 'ArchInput',
      required: true,
      nullable: false,
      validation: {},
    },
  ],
  filters: [
    {
      name: 'activeContacts',
      label: 'Active Contacts',
      input: 'number',
      component: 'ArchInput',
      required: false,
      nullable: false,
      validation: {},
    },
    {
      name: 'openCompanies',
      label: 'Open Companies',
      input: 'number',
      component: 'ArchInput',
      required: false,
      nullable: false,
      validation: {},
    },
    {
      name: 'conversionRate',
      label: 'Conversion Rate',
      input: 'number',
      component: 'ArchInput',
      required: false,
      nullable: false,
      validation: {},
    },
  ],
  columns: [
    {
      name: 'activeContacts',
      label: 'Active Contacts',
      cell: 'number',
      sortable: true,
      nullable: false,
    },
    {
      name: 'openCompanies',
      label: 'Open Companies',
      cell: 'number',
      sortable: true,
      nullable: false,
    },
    {
      name: 'conversionRate',
      label: 'Conversion Rate',
      cell: 'number',
      sortable: true,
      nullable: false,
    },
  ],
} as const
