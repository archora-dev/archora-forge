// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"5462738c2a15","configHash":"92d23261264d"}
import { createMutation, useQueryClient, type CreateMutationOptions } from '@tanstack/svelte-query'
import { petsClient } from '../../../shared/api/generated/pets/pets.client'
import { petsQueryKeys } from '../../../shared/api/generated/pets/pets.query-keys'
import type {
  CreatePetRequest,
  CreatePetResponse,
} from '../../../shared/api/generated/pets/pets.types'

export function useCreatePetMutation(
  options?: Omit<CreateMutationOptions<CreatePetResponse, Error, CreatePetRequest>, 'mutationFn'>,
) {
  const queryClient = useQueryClient()
  return createMutation({
    mutationFn: (input: CreatePetRequest) => petsClient.createPet(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: petsQueryKeys.list() })
    },
    ...options,
  })
}
