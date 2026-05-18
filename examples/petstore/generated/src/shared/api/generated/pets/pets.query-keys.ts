import type { PetId, PetsListParams } from './pets.types'

export const petsQueryKeys = {
  all: ['pets'] as const,
  list: (params?: PetsListParams) => [...petsQueryKeys.all, 'list', params] as const,
  detail: (id: PetId) => [...petsQueryKeys.all, 'detail', id] as const,
} as const
