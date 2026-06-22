import { get } from 'svelte/store'

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

// Exercises the generated Svelte Query runes against the real `@tanstack/svelte-query`
// runtime: list/detail queries plus create/update/delete mutations with their typed inputs.
// Svelte Query returns stores, so results are read with `get(...)`. (Calling these requires a
// Svelte component context at runtime; this file only type-checks that the generated
// signatures line up with the installed library.)
export function petsPanel(selectedId: PetId, draft: CreatePetRequest, edit: UpdatePetRequest) {
  const list = usePetsQuery()
  const detail = usePetQuery(selectedId)
  const create = useCreatePetMutation()
  const update = useUpdatePetMutation()
  const remove = useDeletePetMutation()

  return {
    listPending: get(list).isPending,
    found: get(detail).data !== undefined,
    create: () => get(create).mutate(draft),
    update: () => get(update).mutate({ id: selectedId, payload: edit }),
    remove: () => get(remove).mutate(selectedId),
  }
}
