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
