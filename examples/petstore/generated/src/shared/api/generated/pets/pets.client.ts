// @archora-forge-generated
// @archora-forge-meta {"version":"2.0.0","schemaHash":"5462738c2a15","configHash":"f1d971045876"}
import {
  createApiClient,
  type ApiClient,
  type ApiClientOptions,
  type ApiRequestOptions,
} from '@archora/forge-runtime'
import type {
  PetsListParams,
  PetsListResponse,
  PetId,
  PetDetailResponse,
  CreatePetRequest,
  CreatePetResponse,
  UpdatePetRequest,
  UpdatePetResponse,
} from './pets.types'

export type PetsRequestOptions = Omit<ApiRequestOptions, 'body' | 'params'>

let apiClient = createApiClient({ baseUrl: '' })

export function configurePetsClient(options: ApiClientOptions): void {
  apiClient = createApiClient(options)
}

export function setPetsClient(client: ApiClient): void {
  apiClient = client
}

export const petsClient: {
  listPets: (params?: PetsListParams, options?: PetsRequestOptions) => Promise<PetsListResponse>
  getPet: (petId: PetId, options?: PetsRequestOptions) => Promise<PetDetailResponse>
  createPet: (payload: CreatePetRequest, options?: PetsRequestOptions) => Promise<CreatePetResponse>
  updatePet: (
    petId: PetId,
    payload: UpdatePetRequest,
    options?: PetsRequestOptions,
  ) => Promise<UpdatePetResponse>
  deletePet: (petId: PetId, options?: PetsRequestOptions) => Promise<void>
} = {
  listPets: (params, options) =>
    apiClient.request<PetsListResponse>('GET', `/pets`, {
      ...options,
      params: params as Record<string, unknown> | undefined,
    }),
  getPet: (petId, options) =>
    apiClient.request<PetDetailResponse>(
      'GET',
      `/pets/${encodeURIComponent(String(petId))}`,
      options,
    ),
  createPet: (payload, options) =>
    apiClient.request<CreatePetResponse>('POST', '/pets', { ...options, body: payload }),
  updatePet: (petId, payload, options) =>
    apiClient.request<UpdatePetResponse>('PATCH', `/pets/${encodeURIComponent(String(petId))}`, {
      ...options,
      body: payload,
    }),
  deletePet: (petId, options) =>
    apiClient.request<void>('DELETE', `/pets/${encodeURIComponent(String(petId))}`, options),
}
