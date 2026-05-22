import type { DashboardSummaryId, DashboardSummariesListParams } from './dashboardSummary.types'

export const dashboardSummaryQueryKeys = {
  all: ['dashboardSummary'] as const,
  list: (params?: DashboardSummariesListParams) =>
    [...dashboardSummaryQueryKeys.all, 'list', params] as const,
  detail: (id: DashboardSummaryId) => [...dashboardSummaryQueryKeys.all, 'detail', id] as const,
} as const
