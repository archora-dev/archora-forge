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
