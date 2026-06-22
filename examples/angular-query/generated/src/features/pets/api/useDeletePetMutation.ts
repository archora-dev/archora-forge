// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"5462738c2a15","configHash":"3740e4dc71e2"}
import {
  injectMutation,
  injectQueryClient,
  type CreateMutationOptions,
} from '@tanstack/angular-query-experimental'
import { petsClient } from '../../../shared/api/generated/pets/pets.client'
import { petsQueryKeys } from '../../../shared/api/generated/pets/pets.query-keys'
import type { PetId } from '../../../shared/api/generated/pets/pets.types'

export function useDeletePetMutation(
  options?: Omit<CreateMutationOptions<void, Error, PetId>, 'mutationFn'>,
) {
  const queryClient = injectQueryClient()
  return injectMutation(() => ({
    mutationFn: (id: PetId) => petsClient.deletePet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: petsQueryKeys.list() })
    },
    ...options,
  }))
}
