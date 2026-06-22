// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"5462738c2a15","configHash":"7258580f1759"}
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { petsClient } from '../../../shared/api/generated/pets/pets.client'
import { petsQueryKeys } from '../../../shared/api/generated/pets/pets.query-keys'
import type { PetDetailResponse, PetId } from '../../../shared/api/generated/pets/pets.types'

export function usePetQuery(
  id: PetId,
  options?: Omit<UseQueryOptions<PetDetailResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: petsQueryKeys.detail(id),
    queryFn: () => petsClient.getPet(id),
    ...options,
  })
}
