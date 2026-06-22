// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"5462738c2a15","configHash":"92d23261264d"}
export type PetCategory = 'dog' | 'cat' | 'bird' | 'reptile' | 'other'

export type PetStatus = 'available' | 'pending' | 'sold'

export type CreatePetDtoCategory = 'dog' | 'cat' | 'bird' | 'reptile' | 'other'

export type UpdatePetDtoStatus = 'available' | 'pending' | 'sold'

export type OrderStatus = 'placed' | 'approved' | 'delivered'

export interface Pet {
  id: string
  name: string
  category?: PetCategory
  status: PetStatus
  tags?: string[]
  photoUrls?: string[]
}

export interface CreatePetDto {
  name: string
  category: CreatePetDtoCategory
  tags?: string[]
}

export interface UpdatePetDto {
  name?: string
  status?: UpdatePetDtoStatus
}

export interface Order {
  id: string
  petId: string
  quantity: number
  shipDate?: string
  status: OrderStatus
  complete?: boolean
}

export interface CreateOrderDto {
  petId: string
  quantity: number
  shipDate?: string
}

export interface User {
  username: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
}
