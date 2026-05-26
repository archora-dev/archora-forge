// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.1","schemaHash":"5462738c2a15","configHash":"f1d971045876"}
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
