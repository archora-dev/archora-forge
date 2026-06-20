// @archora-forge-generated
// @archora-forge-meta {"version":"1.4.0","schemaHash":"5462738c2a15","configHash":"eade995640b5"}
import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/vue-query'
import { petsClient } from '../../../shared/api/generated/pets/pets.client'
import { petsQueryKeys } from '../../../shared/api/generated/pets/pets.query-keys'
import type { PetId } from '../../../shared/api/generated/pets/pets.types'

export function useDeletePetMutation(
  options?: Omit<UseMutationOptions<void, Error, PetId>, 'mutationFn'>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: PetId) => petsClient.deletePet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: petsQueryKeys.list() })
    },
    ...options,
  })
}
