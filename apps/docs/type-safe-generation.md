# Type-safe Generation

Forge derives TypeScript types from OpenAPI schemas and reuses them across clients, query keys and Vue composables.

```ts
export type UserStatus = 'active' | 'blocked' | 'pending'

export interface User {
  id: string
  email: string
  status: UserStatus
  age?: number | null
  verified?: boolean
}

export interface UsersListResponse {
  items?: User[]
  total?: number
  page?: number
}
```

Generated client methods keep request and response types attached to operations:

```ts
export const usersClient: {
  listUsers: (params?: UsersListParams) => Promise<UsersListResponse>
  getUser: (id: UserId) => Promise<User>
  createUser: (payload: CreateUserRequest) => Promise<User>
  updateUser: (id: UserId, payload: UpdateUserRequest) => Promise<User>
  deleteUser: (id: UserId) => Promise<void>
}
```

Generated composables preserve those types:

```ts
export function useUsersQuery(params?: UsersListParams): Promise<UsersListResponse>
```

The current model supports objects, primitive fields, enums, arrays, nullable fields, nested objects, operation params and operation response aliases. Deep `oneOf`, `anyOf` and `allOf` support is a roadmap item.
