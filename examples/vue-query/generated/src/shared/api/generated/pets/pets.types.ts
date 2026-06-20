// @archora-forge-generated
// @archora-forge-meta {"version":"1.3.0","schemaHash":"5462738c2a15","configHash":"eade995640b5"}
import type { CreatePetDto, Pet, UpdatePetDto } from '../components.types'

export type { CreatePetDto, Pet, UpdatePetDto } from '../components.types'

export type PetId = string

export type PetDetailResponse = Pet

export interface PetsListParams {
  status?: 'available' | 'pending' | 'sold'
  limit?: number
}

export type PetsListResponse = Pet[]

export type CreatePetRequest = CreatePetDto

export type CreatePetResponse = Pet

export type UpdatePetRequest = UpdatePetDto

export type UpdatePetResponse = Pet
