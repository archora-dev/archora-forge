import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { Buffer } from 'node:buffer'
import { webcrypto } from 'node:crypto'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { TextEncoder } from 'node:util'

const LICENSE_PREFIX = 'ARCHORA-FORGE-'
const CLOCK_SKEW_MS = 5 * 60 * 1000

// Replaced at build time by tsup `define` (see packages/cli/tsup.config.ts). Holds the
// public verification key in enforced release builds; undefined in source/dev runs.
declare const __ARCHORA_FORGE_PUBLIC_KEY_JWK__: string | undefined

// The verification public key, preferring the build-time embedded key (which cannot be
// removed by a user) and falling back to the env var for development and self-hosting.
function resolvePublicKeyJwk(): string {
  const embedded = typeof __ARCHORA_FORGE_PUBLIC_KEY_JWK__ !== 'undefined' ? __ARCHORA_FORGE_PUBLIC_KEY_JWK__ : ''
  return embedded || process.env.ARCHORA_FORGE_LICENSE_PUBLIC_KEY_JWK || ''
}

export type LicensePlan = 'trial' | 'pilot' | 'team' | 'organization'

export type LicensePayload = {
  licenseId: string
  customer: string
  issuedAt: string
  expiresAt: string
  plan: LicensePlan
}

export type LicenseValidation = {
  status: 'active' | 'expired' | 'invalid' | 'clockRollback' | 'missing' | 'missingPublicKey'
  payload: LicensePayload | null
  message: string
}

type StoredLicense = {
  key: string
  activatedAt: string
  lastSeenAt: string
}

export function isLicenseEnforcementConfigured(): boolean {
  return resolvePublicKeyJwk().length > 0
}

export async function activateLicenseKey(licenseKey: string, options: { now?: Date } = {}): Promise<LicenseValidation> {
  const validation = await validateLicenseKey(licenseKey, options)
  if (validation.status !== 'active') return validation

  const now = (options.now ?? new Date()).toISOString()
  await writeStoredLicense({
    key: licenseKey.trim(),
    activatedAt: now,
    lastSeenAt: now,
  })

  return validation
}

export async function getStoredLicenseStatus(options: { now?: Date } = {}): Promise<LicenseValidation> {
  const stored = await readStoredLicense()
  if (!stored) return result('missing', null, 'License key is not activated')

  const validation = await validateLicenseKey(stored.key, { ...options, lastSeenAt: stored.lastSeenAt })
  if (validation.status === 'active') {
    await writeStoredLicense({
      ...stored,
      lastSeenAt: (options.now ?? new Date()).toISOString(),
    })
  }
  return validation
}

export async function removeStoredLicense(): Promise<void> {
  await rm(licenseFilePath(), { force: true })
}

export async function requireCommercialLicense(command: string): Promise<void> {
  if (!isLicenseEnforcementConfigured()) return

  const status = await getStoredLicenseStatus()
  if (status.status === 'active') return

  throw new Error(
    [
      `License key required for "${command}".`,
      status.message,
      'Run: archora-forge license activate <license-key>',
      'For evaluation or purchase, contact akotov@archora.dev or Telegram @akotofff.',
    ].join('\n'),
  )
}

export async function validateLicenseKey(
  licenseKey: string,
  options: {
    now?: Date
    lastSeenAt?: string | null
    publicKey?: JsonWebKey | null
  } = {},
): Promise<LicenseValidation> {
  const now = options.now ?? new Date()
  const publicKey = options.publicKey ?? publicLicenseKey()
  if (!publicKey) return result('missingPublicKey', null, 'License public key is not configured')

  const parsed = parseLicenseKey(licenseKey)
  if (!parsed) return result('invalid', null, 'Invalid license format')

  const payload = parsePayload(parsed.payloadSegment)
  if (!payload) return result('invalid', null, 'Invalid license payload')

  const verified = await verifySignature(publicKey, parsed.payloadSegment, parsed.signature)
  if (!verified) return result('invalid', payload, 'Invalid license signature')

  if (isClockRollback(now, options.lastSeenAt)) {
    return result('clockRollback', payload, 'System clock is earlier than the last CLI run')
  }

  const expiresAt = Date.parse(payload.expiresAt)
  if (!Number.isFinite(expiresAt) || now.getTime() > expiresAt) {
    return result('expired', payload, 'License has expired')
  }

  return result('active', payload, 'License is active')
}

function publicLicenseKey(): JsonWebKey | null {
  const raw = resolvePublicKeyJwk()
  if (!raw) return null

  try {
    return JSON.parse(raw) as JsonWebKey
  } catch {
    return null
  }
}

function licenseFilePath(): string {
  if (process.env.ARCHORA_FORGE_LICENSE_FILE) return process.env.ARCHORA_FORGE_LICENSE_FILE
  const configHome = process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config')
  return join(configHome, 'archora-forge', 'license.json')
}

async function readStoredLicense(): Promise<StoredLicense | null> {
  try {
    const parsed = JSON.parse(await readFile(licenseFilePath(), 'utf8')) as Partial<StoredLicense>
    if (typeof parsed.key !== 'string' || typeof parsed.activatedAt !== 'string' || typeof parsed.lastSeenAt !== 'string') {
      return null
    }
    return {
      key: parsed.key,
      activatedAt: parsed.activatedAt,
      lastSeenAt: parsed.lastSeenAt,
    }
  } catch {
    return null
  }
}

async function writeStoredLicense(value: StoredLicense): Promise<void> {
  const path = licenseFilePath()
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function parseLicenseKey(input: string): { payloadSegment: string; signature: Uint8Array } | null {
  const trimmed = input.trim()
  if (!trimmed.startsWith(LICENSE_PREFIX)) return null

  const body = trimmed.slice(LICENSE_PREFIX.length)
  const [payloadSegment, signatureSegment, extra] = body.split('.')
  if (!payloadSegment || !signatureSegment || extra) return null

  try {
    return {
      payloadSegment,
      signature: base64UrlToBytes(signatureSegment),
    }
  } catch {
    return null
  }
}

function parsePayload(segment: string): LicensePayload | null {
  try {
    const raw = Buffer.from(base64UrlToBase64(segment), 'base64').toString('utf8')
    const payload = JSON.parse(raw) as Partial<LicensePayload>

    if (
      typeof payload.licenseId !== 'string' ||
      typeof payload.customer !== 'string' ||
      typeof payload.issuedAt !== 'string' ||
      typeof payload.expiresAt !== 'string' ||
      !isLicensePlan(payload.plan)
    ) {
      return null
    }

    return {
      licenseId: payload.licenseId,
      customer: payload.customer,
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt,
      plan: payload.plan,
    }
  } catch {
    return null
  }
}

async function verifySignature(publicKey: JsonWebKey, payloadSegment: string, signature: Uint8Array): Promise<boolean> {
  try {
    const key = await webcrypto.subtle.importKey('jwk', publicKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    return webcrypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      bytesToArrayBuffer(signature),
      new TextEncoder().encode(payloadSegment),
    )
  } catch {
    return false
  }
}

function isLicensePlan(value: unknown): value is LicensePlan {
  return value === 'trial' || value === 'pilot' || value === 'team' || value === 'organization'
}

function isClockRollback(now: Date, lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false
  const lastSeen = Date.parse(lastSeenAt)
  if (!Number.isFinite(lastSeen)) return false
  return now.getTime() + CLOCK_SKEW_MS < lastSeen
}

function base64UrlToBytes(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64UrlToBase64(value), 'base64'))
}

function base64UrlToBase64(value: string): string {
  return value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function result(status: LicenseValidation['status'], payload: LicensePayload | null, message: string): LicenseValidation {
  return { status, payload, message }
}
