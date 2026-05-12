export function createBarrelTemplate(exports: string[]): string {
  return exports.map((item) => `export * from './${item}.js'`).join('\n')
}
