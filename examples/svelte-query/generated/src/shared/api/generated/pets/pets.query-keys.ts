// @archora-forge-generated
// @archora-forge-meta {"version":"1.4.0","schemaHash":"5462738c2a15","configHash":"92d23261264d"}
import type { PetId, PetsListParams } from './pets.types'

export const petsQueryKeys = {
  all: ['pets'] as const,
  list: (params?: PetsListParams) => [...petsQueryKeys.all, 'list', params] as const,
  detail: (id: PetId) => [...petsQueryKeys.all, 'detail', id] as const,
} as const
