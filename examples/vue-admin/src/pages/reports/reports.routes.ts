import { reportsPermissions } from '../../features/reports/model/reports.permissions'

export const reportsRoutes = [
  {
    path: '/reports',
    name: 'reports',
    component: () => import('./ReportsPage.generated.vue'),
    meta: { permission: reportsPermissions.view },
  },
] as const
