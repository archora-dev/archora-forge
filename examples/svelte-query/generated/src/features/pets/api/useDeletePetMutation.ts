// @archora-forge-generated
// @archora-forge-meta {"version":"1.4.0","schemaHash":"5462738c2a15","configHash":"92d23261264d"}
import { createMutation, useQueryClient, type CreateMutationOptions } from '@tanstack/svelte-query'
import { petsClient } from '../../../shared/api/generated/pets/pets.client'
import { petsQueryKeys } from '../../../shared/api/generated/pets/pets.query-keys'
import type { PetId } from '../../../shared/api/generated/pets/pets.types'

export function useDeletePetMutation(
  options?: Omit<CreateMutationOptions<void, Error, PetId>, 'mutationFn'>,
) {
  const queryClient = useQueryClient()
  return createMutation({
    mutationFn: (id: PetId) => petsClient.deletePet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: petsQueryKeys.list() })
    },
    ...options,
  })
}
