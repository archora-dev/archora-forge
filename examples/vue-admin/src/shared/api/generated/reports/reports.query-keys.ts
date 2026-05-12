import type { ReportId, ReportsListParams } from './reports.types'

export const reportsQueryKeys = {
  all: ['reports'] as const,
  list: (params?: ReportsListParams) => [...reportsQueryKeys.all, 'list', params] as const,
  detail: (id: ReportId) => [...reportsQueryKeys.all, 'detail', id] as const,
} as const
