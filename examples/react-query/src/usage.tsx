import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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

const queryClient = new QueryClient()

type PetsPanelProps = {
  selectedId: PetId
  draft: CreatePetRequest
  edit: UpdatePetRequest
}

// Exercises the generated TanStack Query hooks against the real
// `@tanstack/react-query` runtime: list/detail queries plus create/update/delete
// mutations with their typed inputs and cache invalidation.
function PetsPanel({ selectedId, draft, edit }: PetsPanelProps) {
  const list = usePetsQuery()
  const detail = usePetQuery(selectedId)
  const create = useCreatePetMutation()
  const update = useUpdatePetMutation()
  const remove = useDeletePetMutation()

  if (list.isPending) return <p>Loading pets…</p>
  if (list.isError) return <p>Failed to load pets</p>

  return (
    <div>
      <p>Pets loaded: {list.data ? 'yes' : 'no'}</p>
      <p>Selected pet: {detail.data ? 'found' : 'missing'}</p>
      <button type="button" onClick={() => create.mutate(draft)}>
        Create
      </button>
      <button type="button" onClick={() => update.mutate({ id: selectedId, payload: edit })}>
        Update
      </button>
      <button type="button" onClick={() => remove.mutate(selectedId)}>
        Delete
      </button>
    </div>
  )
}

export function App(props: PetsPanelProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <PetsPanel {...props} />
    </QueryClientProvider>
  )
}
