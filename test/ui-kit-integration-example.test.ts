import { describe, expect, test } from 'vitest'

import {
  createUsersFilterFields,
  createUsersFormFields,
  createUsersTableColumns,
} from '../examples/ui-kit-integration/src/users.ui-kit.js'

describe('UI-kit integration example', () => {
  test('maps generated resource metadata into consumer UI contracts', () => {
    expect(createUsersTableColumns()).toEqual([
      { dataIndex: 'email', title: 'Email', sortable: true, renderer: 'text' },
      { dataIndex: 'status', title: 'Status', sortable: true, renderer: 'badge' },
      { dataIndex: 'createdAt', title: 'Created At', sortable: true, renderer: 'dateTime' },
    ])
    expect(createUsersFormFields()).toEqual([
      { name: 'email', label: 'Email', control: 'email', required: true },
      {
        name: 'status',
        label: 'Status',
        control: 'select',
        required: true,
        options: ['active', 'invited', 'disabled'],
      },
    ])
    expect(createUsersFilterFields()).toEqual([
      { name: 'email', label: 'Email', control: 'email' },
      { name: 'status', label: 'Status', control: 'select', options: ['active', 'invited', 'disabled'] },
    ])
  })
})
