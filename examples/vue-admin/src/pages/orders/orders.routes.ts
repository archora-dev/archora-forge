import { ordersPermissions } from '../../features/orders/model/orders.permissions'

export const ordersRoutes = [
  {
    path: '/orders',
    name: 'orders',
    component: () => import('./OrdersPage.generated.vue'),
    meta: { permission: ordersPermissions.view },
  },
] as const
