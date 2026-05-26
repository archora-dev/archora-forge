// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.0","schemaHash":"5462738c2a15","configHash":"f1d971045876"}
import { petsClient } from '../../../shared/api/generated/pets/pets.client'
import { petsQueryKeys } from '../../../shared/api/generated/pets/pets.query-keys'
import type {
  PetsListParams,
  PetsListResponse,
} from '../../../shared/api/generated/pets/pets.types'

export function usePetsQuery(params?: PetsListParams): Promise<PetsListResponse> {
  petsQueryKeys.list(params)
  return petsClient.listPets(params)
}
