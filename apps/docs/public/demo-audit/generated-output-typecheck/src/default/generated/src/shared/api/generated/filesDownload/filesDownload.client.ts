import {
  createApiClient,
  type ApiClient,
  type ApiClientOptions,
  type ApiRequestOptions,
} from '@archora/forge-runtime'
import type {
  DownloadFileOperationParams,
  DownloadFileOperationResponse,
} from './filesDownload.types'

export type FilesDownloadRequestOptions = Omit<ApiRequestOptions, 'body' | 'params'>

let apiClient = createApiClient({ baseUrl: '' })

export function configureFilesDownloadsClient(options: ApiClientOptions): void {
  apiClient = createApiClient(options)
}

export function setFilesDownloadsClient(client: ApiClient): void {
  apiClient = client
}

export const filesDownloadClient: {
  downloadFile: (
    params: DownloadFileOperationParams,
    options?: FilesDownloadRequestOptions,
  ) => Promise<DownloadFileOperationResponse>
} = {
  downloadFile: (params, options) =>
    apiClient.request<DownloadFileOperationResponse>(
      'GET',
      `/files/${encodeURIComponent(String(params.fileId))}/download`,
      options,
    ),
}
