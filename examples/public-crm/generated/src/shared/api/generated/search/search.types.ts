// @archora-forge-generated
// @archora-forge-meta {"version":"1.1.0","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
import type { SearchResult } from '../components.types'

export type { SearchResult } from '../components.types'

export interface Search {
  [key: string]: unknown
}

export type SearchId = string

export type SearchDetailResponse = Search

export type SearchesListParams = Record<string, never>

export type SearchesListResponse = unknown

export type CreateSearchRequest = Partial<Search>

export type CreateSearchResponse = Search

export type UpdateSearchRequest = Partial<Search>

export type UpdateSearchResponse = Search

export interface SearchWorkspaceOperationParams {
  q: string
  type?: 'contact' | 'company'
}

export type SearchWorkspaceOperationRequest = void

export type SearchWorkspaceOperationResponse = SearchResult[]
