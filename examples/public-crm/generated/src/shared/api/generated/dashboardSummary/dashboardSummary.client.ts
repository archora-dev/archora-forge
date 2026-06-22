// @archora-forge-generated
// @archora-forge-meta {"version":"2.0.0","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
import {
  createApiClient,
  type ApiClient,
  type ApiClientOptions,
  type ApiRequestOptions,
} from '@archora/forge-runtime'
import type { GetDashboardSummaryOperationResponse } from './dashboardSummary.types'

export type DashboardSummaryRequestOptions = Omit<ApiRequestOptions, 'body' | 'params'>

let apiClient = createApiClient({ baseUrl: '' })

export function configureDashboardSummariesClient(options: ApiClientOptions): void {
  apiClient = createApiClient(options)
}

export function setDashboardSummariesClient(client: ApiClient): void {
  apiClient = client
}

export const dashboardSummaryClient: {
  getDashboardSummary: (
    options?: DashboardSummaryRequestOptions,
  ) => Promise<GetDashboardSummaryOperationResponse>
} = {
  getDashboardSummary: (options) =>
    apiClient.request<GetDashboardSummaryOperationResponse>('GET', '/dashboard/summary', options),
}
