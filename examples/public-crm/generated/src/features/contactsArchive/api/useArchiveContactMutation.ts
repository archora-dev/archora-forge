// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.0","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
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
