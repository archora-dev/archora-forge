// @archora-forge-generated
// @archora-forge-meta {"version":"1.4.0","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
import type { FilesDownloadId, FilesDownloadsListParams } from './filesDownload.types'

export const filesDownloadQueryKeys = {
  all: ['filesDownload'] as const,
  list: (params?: FilesDownloadsListParams) =>
    [...filesDownloadQueryKeys.all, 'list', params] as const,
  detail: (id: FilesDownloadId) => [...filesDownloadQueryKeys.all, 'detail', id] as const,
} as const
