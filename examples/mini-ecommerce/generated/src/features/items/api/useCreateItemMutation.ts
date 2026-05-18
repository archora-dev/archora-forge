// @archora-forge-generated
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
