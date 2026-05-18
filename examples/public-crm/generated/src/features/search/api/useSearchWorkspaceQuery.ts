// @archora-forge-generated
// @archora-forge-meta {"version":"1.0.0","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
import { searchClient } from '../../../shared/api/generated/search/search.client'
import type {
  SearchWorkspaceOperationParams,
  SearchWorkspaceOperationResponse,
} from '../../../shared/api/generated/search/search.types'

type SearchWorkspaceOperationInput = SearchWorkspaceOperationParams

export function useSearchWorkspaceQuery(): {
  mutate: (input: SearchWorkspaceOperationInput) => Promise<SearchWorkspaceOperationResponse>
} {
  return {
    mutate: (input) => searchClient.searchWorkspace(input),
  }
}
