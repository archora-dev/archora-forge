export type ForgeErrorDetails = {
  reason?: string
  suggestion?: string
  context?: Record<string, string | number | boolean>
}

export class ForgeError extends Error {
  readonly details: ForgeErrorDetails

  constructor(message: string, details: ForgeErrorDetails = {}) {
    super(message)
    this.name = 'ForgeError'
    this.details = details
  }
}
