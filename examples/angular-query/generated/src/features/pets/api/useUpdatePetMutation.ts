// @archora-forge-generated
// @archora-forge-meta {"version":"1.4.0","schemaHash":"5462738c2a15","configHash":"3740e4dc71e2"}
import {
  injectMutation,
  injectQueryClient,
  type CreateMutationOptions,
} from '@tanstack/angular-query-experimental'
import { petsClient } from '../../../shared/api/generated/pets/pets.client'
import { petsQueryKeys } from '../../../shared/api/generated/pets/pets.query-keys'
import type {
  PetId,
  UpdatePetRequest,
  UpdatePetResponse,
} from '../../../shared/api/generated/pets/pets.types'

export function useUpdatePetMutation(
  options?: Omit<
    CreateMutationOptions<UpdatePetResponse, Error, { id: PetId; payload: UpdatePetRequest }>,
    'mutationFn'
  >,
) {
  const queryClient = injectQueryClient()
  return injectMutation(() => ({
    mutationFn: (input: { id: PetId; payload: UpdatePetRequest }) =>
      petsClient.updatePet(input.id, input.payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: petsQueryKeys.detail(variables.id) })
    },
    ...options,
  }))
}
