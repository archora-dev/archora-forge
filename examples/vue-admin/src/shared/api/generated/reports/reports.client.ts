import { createApiClient } from '@archora/forge-runtime'
import type { ReportsListParams, ReportsListResponse } from './reports.types'

const apiClient = createApiClient({ baseUrl: '' })

export const reportsClient: {
  listReports: (params?: ReportsListParams) => Promise<ReportsListResponse>
} = {
  listReports: (params) =>
    apiClient.request<ReportsListResponse>('GET', '/reports', {
      params: params as Record<string, unknown> | undefined,
    }),
}
