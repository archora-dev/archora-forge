// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"5462738c2a15","configHash":"3740e4dc71e2"}
import { injectQuery, type CreateQueryOptions } from '@tanstack/angular-query-experimental'
import { petsClient } from '../../../shared/api/generated/pets/pets.client'
import { petsQueryKeys } from '../../../shared/api/generated/pets/pets.query-keys'
import type { PetDetailResponse, PetId } from '../../../shared/api/generated/pets/pets.types'

export function usePetQuery(
  id: PetId,
  options?: Omit<CreateQueryOptions<PetDetailResponse>, 'queryKey' | 'queryFn'>,
) {
  return injectQuery(() => ({
    queryKey: petsQueryKeys.detail(id),
    queryFn: () => petsClient.getPet(id),
    ...options,
  }))
}
