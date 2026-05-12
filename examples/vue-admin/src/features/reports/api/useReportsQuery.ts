import { reportsClient } from '../../../shared/api/generated/reports/reports.client'
import { reportsQueryKeys } from '../../../shared/api/generated/reports/reports.query-keys'
import type {
  ReportsListParams,
  ReportsListResponse,
} from '../../../shared/api/generated/reports/reports.types'

export function useReportsQuery(params?: ReportsListParams): Promise<ReportsListResponse> {
  reportsQueryKeys.list(params)
  return reportsClient.listReports(params)
}
