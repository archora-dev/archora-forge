import {
  useCreatePetMutation,
  useDeletePetMutation,
  usePetQuery,
  usePetsQuery,
  useUpdatePetMutation,
} from '../generated/src/features/pets/api'
import type {
  CreatePetRequest,
  PetId,
  UpdatePetRequest,
} from '../generated/src/shared/api/generated/pets/pets.types'

// Exercises the generated Vue Query composables against the real
// `@tanstack/vue-query` runtime. Each hook is meant to be called inside a
// component `setup()`; here it doubles as a compile-time contract test.
export function usePetsScreen(selectedId: PetId, draft: CreatePetRequest, edit: UpdatePetRequest) {
  const list = usePetsQuery()
  const detail = usePetQuery(selectedId)
  const create = useCreatePetMutation()
  const update = useUpdatePetMutation()
  const remove = useDeletePetMutation()

  return {
    isLoading: list.isPending,
    pets: list.data,
    selected: detail.data,
    createPet: () => create.mutate(draft),
    updatePet: () => update.mutate({ id: selectedId, payload: edit }),
    deletePet: () => remove.mutate(selectedId),
  }
}
