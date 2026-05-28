import { usersClient } from './generated/users/users.client'

export async function loadUsers() {
  return usersClient.listUsers()
}
