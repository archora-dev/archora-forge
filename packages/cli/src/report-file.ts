import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

export async function writeReportFile(path: string, content: string): Promise<string> {
  const resolvedPath = resolve(path)
  await mkdir(dirname(resolvedPath), { recursive: true })
  await writeFile(resolvedPath, `${content.trimEnd()}\n`, 'utf8')
  return resolvedPath
}
