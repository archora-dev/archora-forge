// @archora-forge-generated
// @archora-forge-meta {"version":"1.2.1","schemaHash":"66e8f461600e","configHash":"f1d971045876"}
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
