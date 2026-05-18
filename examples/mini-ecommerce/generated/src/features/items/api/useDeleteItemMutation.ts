import { itemsClient } from '../../../shared/api/generated/items/items.client'
import { itemsQueryKeys } from '../../../shared/api/generated/items/items.query-keys'
import type { ItemId } from '../../../shared/api/generated/items/items.types'

export function useDeleteItemMutation(): {
  mutate: (id: ItemId) => Promise<void>
  invalidate: () => ReturnType<typeof itemsQueryKeys.list>
} {
  return {
    mutate: (id) => itemsClient.removeCartItem(id),
    invalidate: () => itemsQueryKeys.list(),
  }
}
