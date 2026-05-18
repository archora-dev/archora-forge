// @archora-forge-generated
import { petsClient } from '../../../shared/api/generated/pets/pets.client'
import { petsQueryKeys } from '../../../shared/api/generated/pets/pets.query-keys'
import type {
  CreatePetRequest,
  CreatePetResponse,
} from '../../../shared/api/generated/pets/pets.types'

export function useCreatePetMutation(): {
  mutate: (payload: CreatePetRequest) => Promise<CreatePetResponse>
  invalidate: () => ReturnType<typeof petsQueryKeys.list>
} {
  return {
    mutate: (payload: CreatePetRequest) => petsClient.createPet(payload),
    invalidate: () => petsQueryKeys.list(),
  }
}
