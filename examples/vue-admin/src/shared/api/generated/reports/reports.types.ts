import type { Report } from '../components.types'

export type { Report } from '../components.types'

export type ReportId = string

export type ReportDetailResponse = Report

export type ReportsListParams = Record<string, never>

export interface ReportsListResponse {
  items?: Report[]
  total?: number
  page?: number
}

export type CreateReportRequest = Partial<Report>

export type CreateReportResponse = Report

export type UpdateReportRequest = Partial<Report>

export type UpdateReportResponse = Report
