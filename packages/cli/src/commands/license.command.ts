import type { CAC } from 'cac'
import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { promisify } from 'node:util'

import { cliVersion } from '../package-metadata.js'
import { activateLicenseKey, getStoredLicenseStatus, removeStoredLicense } from '../license.js'
import { logger } from '../ui/logger.js'

const execFileAsync = promisify(execFile)

type LicenseOptions = {
  key?: string
  json?: boolean
  out?: string
  plan?: string
}

export function registerLicenseCommand(cli: CAC): void {
  cli.command('license <action> [key]', 'Manage Archora Forge license activation')
    .option('--key <key>', 'License key to activate')
    .option('--json', 'Print machine-readable JSON')
    .option('--out <path>', 'Write license request markdown to this path')
    .option('--plan <plan>', 'Requested plan: trial, pilot, team or organization')
    .action(async (action: string, key: string | undefined, options: LicenseOptions) => {
      try {
        if (action === 'activate') {
          const licenseKey = options.key ?? key
          if (!licenseKey) throw new Error('Missing license key. Usage: archora-forge license activate <license-key>')
          const validation = await activateLicenseKey(licenseKey)
          if (validation.status !== 'active') throw new Error(validation.message)

          const payload = {
            ok: true,
            status: validation.status,
            license: validation.payload,
          }
          if (options.json) console.log(JSON.stringify(payload, null, 2))
          else logger.success(`License active for ${validation.payload?.customer}`)
          return
        }

        if (action === 'status') {
          const validation = await getStoredLicenseStatus()
          const payload = {
            ok: validation.status === 'active',
            status: validation.status,
            message: validation.message,
            license: validation.payload,
          }
          if (options.json) console.log(JSON.stringify(payload, null, 2))
          else {
            logger.line(`License status: ${validation.status}`)
            if (validation.payload) {
              logger.line(`Customer: ${validation.payload.customer}`)
              logger.line(`Plan: ${validation.payload.plan}`)
              logger.line(`Expires: ${validation.payload.expiresAt}`)
            } else {
              logger.line(validation.message)
            }
          }
          process.exitCode = validation.status === 'active' ? 0 : 1
          return
        }

        if (action === 'remove') {
          await removeStoredLicense()
          const payload = { ok: true, status: 'removed' }
          if (options.json) console.log(JSON.stringify(payload, null, 2))
          else logger.success('License removed')
          return
        }

        if (action === 'request') {
          const request = await createLicenseRequest({ out: options.out, plan: options.plan })
          if (options.json) console.log(JSON.stringify({ ok: true, path: request.path }, null, 2))
          else logger.success(`License request written: ${request.path}`)
          return
        }

        throw new Error(`Unknown license action "${action}". Use activate, status, request or remove.`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (options.json) console.log(JSON.stringify({ ok: false, error: message }, null, 2))
        else logger.error(message)
        process.exitCode = 2
      }
    })
}

async function createLicenseRequest(options: { out?: string; plan?: string }): Promise<{ path: string }> {
  const plan = normalizePlan(options.plan)
  const outPath = resolve(options.out ?? 'license-request.md')
  const remoteHost = await readGitRemoteHost()
  const cwd = process.cwd()

  const markdown = [
    '# Archora Forge License Request',
    '',
    `Plan: ${plan}`,
    `Created: ${new Date().toISOString()}`,
    `Forge CLI version: ${cliVersion}`,
    `Node.js: ${process.version}`,
    `Platform: ${process.platform}/${process.arch}`,
    `Workspace: ${basename(cwd)}`,
    `Git remote host: ${remoteHost ?? 'not detected'}`,
    '',
    'Send this request to akotov@archora.dev or Telegram @akotofff.',
    '',
    '## Pilot scope',
    '',
    '- Company/team:',
    '- Contact:',
    '- Schema count:',
    '- Frontend stack:',
    '- Expected usage: local evaluation / paid pilot / team rollout',
    '',
    '## Notes',
    '',
    '- Do not attach private schemas unless explicitly agreed.',
    '- Forge license requests do not require source code, environment variables or private API data.',
    '',
  ].join('\n')

  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, markdown, 'utf8')
  return { path: outPath }
}

function normalizePlan(value: string | undefined): string {
  if (!value) return 'trial'
  if (value === 'trial' || value === 'pilot' || value === 'team' || value === 'organization') return value
  throw new Error('Invalid plan. Use trial, pilot, team or organization.')
}

async function readGitRemoteHost(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['remote', 'get-url', 'origin'], {
      cwd: process.cwd(),
      timeout: 2_000,
    })
    return sanitizeRemoteHost(stdout.trim())
  } catch {
    return null
  }
}

function sanitizeRemoteHost(remote: string): string | null {
  if (!remote) return null
  const sshMatch = remote.match(/^[^@]+@([^:/]+)[:/]/)
  if (sshMatch?.[1]) return sshMatch[1]

  try {
    const parsed = new URL(remote.replace(/^git\+/, ''))
    return parsed.hostname || null
  } catch {
    return null
  }
}
