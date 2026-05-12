import type { NormalizedOperation, OperationKind } from '../openapi/openapi.types.js'

export type CrudOperation = 'list' | 'detail' | 'create' | 'update' | 'delete'
export type ResourceKind = OperationKind

export type DetectedResource = {
  name: string
  entity: string
  kind: ResourceKind
  operationsList: NormalizedOperation[]
  operationsByKind: Partial<Record<OperationKind, NormalizedOperation[]>>
  operations: Partial<Record<CrudOperation, NormalizedOperation>>
  missing: CrudOperation[]
  isCrudCandidate: boolean
}

export type ResolvedResource = DetectedResource & {
  outputName: string
  permissions: Record<'view' | 'create' | 'update' | 'delete', string>
}
