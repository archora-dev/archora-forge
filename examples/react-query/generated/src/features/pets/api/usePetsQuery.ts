// @archora-forge-generated
// @archora-forge-meta {"version":"1.3.0","schemaHash":"5462738c2a15","configHash":"7258580f1759"}
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { petsClient } from '../../../shared/api/generated/pets/pets.client'
import { petsQueryKeys } from '../../../shared/api/generated/pets/pets.query-keys'
import type {
  PetsListParams,
  PetsListResponse,
} from '../../../shared/api/generated/pets/pets.types'

export function usePetsQuery(
  params?: PetsListParams,
  options?: Omit<UseQueryOptions<PetsListResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: petsQueryKeys.list(params),
    queryFn: () => petsClient.listPets(params),
    ...options,
  })
}
