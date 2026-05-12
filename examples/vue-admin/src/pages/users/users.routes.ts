import { usersPermissions } from '../../features/users/model/users.permissions'

export const usersRoutes = [
  {
    path: '/users',
    name: 'users',
    component: () => import('./UsersPage.generated.vue'),
    meta: { permission: usersPermissions.view },
  },
] as const
