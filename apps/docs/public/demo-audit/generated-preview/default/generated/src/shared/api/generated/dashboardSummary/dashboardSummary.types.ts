import type { DashboardSummary } from '../components.types'

export type { DashboardSummary } from '../components.types'

export type DashboardSummaryId = string

export type DashboardSummaryDetailResponse = DashboardSummary

export type DashboardSummariesListParams = Record<string, never>

export type DashboardSummariesListResponse = unknown

export type CreateDashboardSummaryRequest = Partial<DashboardSummary>

export type CreateDashboardSummaryResponse = DashboardSummary

export type UpdateDashboardSummaryRequest = Partial<DashboardSummary>

export type UpdateDashboardSummaryResponse = DashboardSummary

export type GetDashboardSummaryOperationParams = Record<string, never>

export type GetDashboardSummaryOperationRequest = void

export type GetDashboardSummaryOperationResponse = DashboardSummary
