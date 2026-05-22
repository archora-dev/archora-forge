// @archora-forge-generated
// @archora-forge-meta {"version":"1.1.0","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
export interface FilesDownload {
  [key: string]: unknown
}

export type FilesDownloadId = string

export type FilesDownloadDetailResponse = FilesDownload

export type FilesDownloadsListParams = Record<string, never>

export type FilesDownloadsListResponse = unknown

export type CreateFilesDownloadRequest = Partial<FilesDownload>

export type CreateFilesDownloadResponse = FilesDownload

export type UpdateFilesDownloadRequest = Partial<FilesDownload>

export type UpdateFilesDownloadResponse = FilesDownload

export interface DownloadFileOperationParams {
  fileId: string
}

export type DownloadFileOperationRequest = void

export type DownloadFileOperationResponse = Blob
