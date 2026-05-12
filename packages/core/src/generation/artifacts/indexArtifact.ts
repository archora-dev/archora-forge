export function createIndex(exports: string[]): string {
  return `${exports.map((item) => `export * from './${item}'`).join('\n')}\n`
}
