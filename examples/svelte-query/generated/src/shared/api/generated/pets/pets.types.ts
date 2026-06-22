// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"5462738c2a15","configHash":"92d23261264d"}
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
