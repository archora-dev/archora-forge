import { petsClient } from '../../../shared/api/generated/pets/pets.client'
import { petsQueryKeys } from '../../../shared/api/generated/pets/pets.query-keys'
import type {
  PetId,
  UpdatePetRequest,
  UpdatePetResponse,
} from '../../../shared/api/generated/pets/pets.types'

export function useUpdatePetMutation(): {
  mutate: (input: { id: PetId; payload: UpdatePetRequest }) => Promise<UpdatePetResponse>
  invalidate: (id: PetId) => ReturnType<typeof petsQueryKeys.detail>
} {
  return {
    mutate: ({ id, payload }) => petsClient.updatePet(id, payload),
    invalidate: (id) => petsQueryKeys.detail(id),
  }
}
