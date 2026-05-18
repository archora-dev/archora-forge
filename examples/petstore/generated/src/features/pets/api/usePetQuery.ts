import { petsClient } from '../../../shared/api/generated/pets/pets.client'
import { petsQueryKeys } from '../../../shared/api/generated/pets/pets.query-keys'
import type { PetDetailResponse, PetId } from '../../../shared/api/generated/pets/pets.types'

export function usePetQuery(id: PetId): Promise<PetDetailResponse> {
  petsQueryKeys.detail(id)
  return petsClient.getPet(id)
}
