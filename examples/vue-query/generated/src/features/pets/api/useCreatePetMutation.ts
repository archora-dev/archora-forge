// @archora-forge-generated
// @archora-forge-meta {"version":"1.4.0","schemaHash":"5462738c2a15","configHash":"eade995640b5"}
import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/vue-query'
import { petsClient } from '../../../shared/api/generated/pets/pets.client'
import { petsQueryKeys } from '../../../shared/api/generated/pets/pets.query-keys'
import type {
  CreatePetRequest,
  CreatePetResponse,
} from '../../../shared/api/generated/pets/pets.types'

export function useCreatePetMutation(
  options?: Omit<UseMutationOptions<CreatePetResponse, Error, CreatePetRequest>, 'mutationFn'>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePetRequest) => petsClient.createPet(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: petsQueryKeys.list() })
    },
    ...options,
  })
}
