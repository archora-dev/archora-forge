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
