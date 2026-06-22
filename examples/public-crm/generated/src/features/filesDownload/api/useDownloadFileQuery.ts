// @archora-forge-generated
// @archora-forge-meta {"version":"2.1.0","schemaHash":"1f70b9ad5985","configHash":"f1d971045876"}
import { filesDownloadClient } from '../../../shared/api/generated/filesDownload/filesDownload.client'
import type {
  DownloadFileOperationParams,
  DownloadFileOperationResponse,
} from '../../../shared/api/generated/filesDownload/filesDownload.types'

type DownloadFileOperationInput = DownloadFileOperationParams

export function useDownloadFileQuery(): {
  mutate: (input: DownloadFileOperationInput) => Promise<DownloadFileOperationResponse>
} {
  return {
    mutate: (input) => filesDownloadClient.downloadFile(input),
  }
}
