import { Component, input } from '@angular/core'

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

// Exercises the generated Angular Query injectors against the real
// `@tanstack/angular-query-experimental` runtime. The injectors must run in an injection
// context, so they are bound as component fields; this file type-checks that the generated
// signatures line up with the installed library.
@Component({ selector: 'pets-panel', template: '' })
export class PetsPanelComponent {
  readonly selectedId = input.required<PetId>()
  readonly draft = input.required<CreatePetRequest>()
  readonly edit = input.required<UpdatePetRequest>()

  readonly list = usePetsQuery()
  readonly detail = usePetQuery(this.selectedId())
  readonly create = useCreatePetMutation()
  readonly update = useUpdatePetMutation()
  readonly remove = useDeletePetMutation()

  createPet(): void {
    this.create.mutate(this.draft())
  }

  updatePet(): void {
    this.update.mutate({ id: this.selectedId(), payload: this.edit() })
  }

  removePet(): void {
    this.remove.mutate(this.selectedId())
  }
}
