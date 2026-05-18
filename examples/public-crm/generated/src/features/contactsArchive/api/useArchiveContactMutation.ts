// @archora-forge-generated
import { contactsArchiveClient } from '../../../shared/api/generated/contactsArchive/contactsArchive.client'
import type {
  ArchiveContactOperationRequest,
  ArchiveContactOperationParams,
  ArchiveContactOperationResponse,
} from '../../../shared/api/generated/contactsArchive/contactsArchive.types'

type ArchiveContactOperationInput = {
  payload: ArchiveContactOperationRequest
  params: ArchiveContactOperationParams
}

export function useArchiveContactMutation(): {
  mutate: (input: ArchiveContactOperationInput) => Promise<ArchiveContactOperationResponse>
} {
  return {
    mutate: (input) => contactsArchiveClient.archiveContact(input.payload, input.params),
  }
}
