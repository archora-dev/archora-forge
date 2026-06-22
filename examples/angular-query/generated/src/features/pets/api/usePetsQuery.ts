// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"5462738c2a15","configHash":"3740e4dc71e2"}
import { injectQuery, type CreateQueryOptions } from '@tanstack/angular-query-experimental'
import { petsClient } from '../../../shared/api/generated/pets/pets.client'
import { petsQueryKeys } from '../../../shared/api/generated/pets/pets.query-keys'
import type {
  PetsListParams,
  PetsListResponse,
} from '../../../shared/api/generated/pets/pets.types'

export function usePetsQuery(
  params?: PetsListParams,
  options?: Omit<CreateQueryOptions<PetsListResponse>, 'queryKey' | 'queryFn'>,
) {
  return injectQuery(() => ({
    queryKey: petsQueryKeys.list(params),
    queryFn: () => petsClient.listPets(params),
    ...options,
  }))
}
