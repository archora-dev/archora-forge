// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.1","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
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
