// @archora-forge-generated
// @archora-forge-meta {"version":"1.1.0","schemaHash":"5462738c2a15","configHash":"f1d971045876"}
import { petsClient } from '../../../shared/api/generated/pets/pets.client'
import { petsQueryKeys } from '../../../shared/api/generated/pets/pets.query-keys'
import type { PetId } from '../../../shared/api/generated/pets/pets.types'

export function useDeletePetMutation(): {
  mutate: (id: PetId) => Promise<void>
  invalidate: () => ReturnType<typeof petsQueryKeys.list>
} {
  return {
    mutate: (id) => petsClient.deletePet(id),
    invalidate: () => petsQueryKeys.list(),
  }
}
