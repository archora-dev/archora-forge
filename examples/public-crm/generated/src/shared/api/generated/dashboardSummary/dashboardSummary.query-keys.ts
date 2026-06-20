// @archora-forge-generated
// @archora-forge-meta {"version":"1.4.0","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
import type { DashboardSummaryId, DashboardSummariesListParams } from './dashboardSummary.types'

export const dashboardSummaryQueryKeys = {
  all: ['dashboardSummary'] as const,
  list: (params?: DashboardSummariesListParams) =>
    [...dashboardSummaryQueryKeys.all, 'list', params] as const,
  detail: (id: DashboardSummaryId) => [...dashboardSummaryQueryKeys.all, 'detail', id] as const,
} as const
