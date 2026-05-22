import { describe, expect, test } from 'vitest'

import { extractPathParameters, renderPathTemplate } from '../packages/core/src/openapi/pathTemplate.js'

describe('OpenAPI path templates', () => {
  test('extracts path parameters without regex parsing', () => {
    expect(extractPathParameters('/teams/{team-id}/users/{user_id}/files/{file.name}')).toEqual(['team-id', 'user_id', 'file.name'])
  })

  test('renders path parameters and preserves malformed placeholders', () => {
    expect(renderPathTemplate('/teams/{team-id}/users/{user_id}', (name) => `[${name}]`)).toBe('/teams/[team-id]/users/[user_id]')
    expect(renderPathTemplate('/literal/{}/open/{missing', (name) => `[${name}]`)).toBe('/literal/{}/open/{missing')
  })
})
