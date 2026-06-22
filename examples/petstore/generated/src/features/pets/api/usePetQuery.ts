// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"5462738c2a15","configHash":"f1d971045876"}
import { petsClient } from '../../../shared/api/generated/pets/pets.client'
import { petsQueryKeys } from '../../../shared/api/generated/pets/pets.query-keys'
import type { PetDetailResponse, PetId } from '../../../shared/api/generated/pets/pets.types'

export function usePetQuery(id: PetId): Promise<PetDetailResponse> {
  petsQueryKeys.detail(id)
  return petsClient.getPet(id)
}
