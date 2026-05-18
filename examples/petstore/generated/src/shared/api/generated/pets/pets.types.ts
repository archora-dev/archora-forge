// @archora-forge-generated
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
