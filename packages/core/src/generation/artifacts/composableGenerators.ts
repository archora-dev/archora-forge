import type { DetectedResource } from '../../resources/resources.types.js'
import {
  createCreateMutation,
  createDeleteMutation,
  createDetailComposable,
  createListComposable,
  createOperationComposable,
  createUpdateMutation,
} from './composablesArtifact.js'

export { operationComposableName } from './composablesArtifact.js'

export type ComposableOperation = DetectedResource['operationsList'][number]

/**
 * Pluggable set of composable-content generators. The generation plan owns file
 * names and exports; a generator only produces the content of a single hook file.
 *
 * The neutral default emits framework-free promise helpers. Framework adapters
 * (TanStack Query, Vue Query) live in `@archora/forge-adapters` so the core stays
 * import-neutral — see the boundaries invariant in CLAUDE.md.
 */
export type ComposableGenerators = {
  list: (resourceName: string, resource: DetectedResource) => string
  detail: (resourceName: string, resource: DetectedResource) => string
  createMutation: (resourceName: string, resource: DetectedResource) => string
  updateMutation: (resourceName: string, resource: DetectedResource) => string
  deleteMutation: (resourceName: string, resource: DetectedResource) => string
  operation: (resourceName: string, operation: ComposableOperation) => string
}

export const neutralComposables: ComposableGenerators = {
  list: createListComposable,
  detail: createDetailComposable,
  createMutation: createCreateMutation,
  updateMutation: createUpdateMutation,
  deleteMutation: createDeleteMutation,
  operation: createOperationComposable,
}
