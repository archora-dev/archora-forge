// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"5462738c2a15","configHash":"7258580f1759"}
import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query'
import { petsClient } from '../../../shared/api/generated/pets/pets.client'
import { petsQueryKeys } from '../../../shared/api/generated/pets/pets.query-keys'
import type {
  PetId,
  UpdatePetRequest,
  UpdatePetResponse,
} from '../../../shared/api/generated/pets/pets.types'

export function useUpdatePetMutation(
  options?: Omit<
    UseMutationOptions<UpdatePetResponse, Error, { id: PetId; payload: UpdatePetRequest }>,
    'mutationFn'
  >,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: PetId; payload: UpdatePetRequest }) =>
      petsClient.updatePet(input.id, input.payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: petsQueryKeys.detail(variables.id) })
    },
    ...options,
  })
}
