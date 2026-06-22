// @archora-forge-generated
// @archora-forge-meta {"version":"1.4.0","schemaHash":"5462738c2a15","configHash":"92d23261264d"}
import { createQuery, type CreateQueryOptions } from '@tanstack/svelte-query'
import { petsClient } from '../../../shared/api/generated/pets/pets.client'
import { petsQueryKeys } from '../../../shared/api/generated/pets/pets.query-keys'
import type { PetDetailResponse, PetId } from '../../../shared/api/generated/pets/pets.types'

export function usePetQuery(
  id: PetId,
  options?: Omit<CreateQueryOptions<PetDetailResponse>, 'queryKey' | 'queryFn'>,
) {
  return createQuery({
    queryKey: petsQueryKeys.detail(id),
    queryFn: () => petsClient.getPet(id),
    ...options,
  })
}
