// @archora-forge-generated
// @archora-forge-meta {"version":"2.0.0","schemaHash":"66e8f461600e","configHash":"f1d971045876"}
import { itemsClient } from '../../../shared/api/generated/items/items.client'
import { itemsQueryKeys } from '../../../shared/api/generated/items/items.query-keys'
import type {
  CreateItemRequest,
  CreateItemResponse,
} from '../../../shared/api/generated/items/items.types'

export function useCreateItemMutation(): {
  mutate: (payload: CreateItemRequest) => Promise<CreateItemResponse>
  invalidate: () => ReturnType<typeof itemsQueryKeys.list>
} {
  return {
    mutate: (payload: CreateItemRequest) => itemsClient.addCartItem(payload),
    invalidate: () => itemsQueryKeys.list(),
  }
}
