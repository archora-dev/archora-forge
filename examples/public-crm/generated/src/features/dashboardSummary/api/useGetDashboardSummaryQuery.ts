// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
import { dashboardSummaryClient } from '../../../shared/api/generated/dashboardSummary/dashboardSummary.client'
import type { GetDashboardSummaryOperationResponse } from '../../../shared/api/generated/dashboardSummary/dashboardSummary.types'

type GetDashboardSummaryOperationInput = void

export function useGetDashboardSummaryQuery(): {
  mutate: (
    input: GetDashboardSummaryOperationInput,
  ) => Promise<GetDashboardSummaryOperationResponse>
} {
  return {
    mutate: (input) => dashboardSummaryClient.getDashboardSummary(),
  }
}
