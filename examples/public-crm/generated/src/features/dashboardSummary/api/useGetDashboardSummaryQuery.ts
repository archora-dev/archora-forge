// @archora-forge-generated
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
