import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { webcrypto } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { TextEncoder } from 'node:util'
import process from 'node:process'

const PRIVATE_KEY_PATH = resolve('.license/private-key.jwk')
const ENV_PATH = resolve('.env.local')
const PREFIX = 'ARCHORA-FORGE-'

const command = process.argv[2] ?? 'issue'

if (command === 'keygen') {
  await generateKeyPair()
} else if (command === 'issue') {
  await issueLicense()
} else {
  usage()
  process.exitCode = 1
}

async function generateKeyPair() {
  if (!hasFlag('--force') && (await fileExists(PRIVATE_KEY_PATH))) {
    console.error(`Private key already exists: ${PRIVATE_KEY_PATH}`)
    console.error('Use pnpm license:keygen -- --force only if existing license codes may stop working.')
    process.exitCode = 1
    return
  }

  const pair = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ])

  const privateKey = await webcrypto.subtle.exportKey('jwk', pair.privateKey)
  const publicKey = await webcrypto.subtle.exportKey('jwk', pair.publicKey)

  await mkdir(dirname(PRIVATE_KEY_PATH), { recursive: true })
  await writeFile(PRIVATE_KEY_PATH, `${JSON.stringify(privateKey, null, 2)}\n`, 'utf8')
  await writeFile(
    ENV_PATH,
    `ARCHORA_FORGE_LICENSE_PUBLIC_KEY_JWK='${JSON.stringify(publicKey)}'\n`,
    'utf8',
  )

  console.log(`Private key: ${PRIVATE_KEY_PATH}`)
  console.log(`Public key env: ${ENV_PATH}`)
}

async function issueLicense() {
  const customer = readArg('--customer')
  if (!customer) {
    console.error('Missing --customer')
    usage()
    process.exitCode = 1
    return
  }

  const days = Number(readArg('--days') ?? '30')
  if (!Number.isInteger(days) || days < 1 || days > 366) {
    console.error('--days must be an integer from 1 to 366')
    process.exitCode = 1
    return
  }

  const plan = readArg('--plan') ?? 'trial'
  if (!['trial', 'team', 'organization', 'pilot'].includes(plan)) {
    console.error('--plan must be one of: trial, team, organization, pilot')
    process.exitCode = 1
    return
  }

  const privateJwk = JSON.parse(await readFile(PRIVATE_KEY_PATH, 'utf8'))
  const privateKey = await webcrypto.subtle.importKey(
    'jwk',
    privateJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )

  const issuedAt = new Date()
  const expiresAt = new Date(issuedAt.getTime() + days * 24 * 60 * 60 * 1000)
  const payload = {
    licenseId: `lic_${randomId()}`,
    customer,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    plan,
  }

  const payloadSegment = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  const signature = await webcrypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(payloadSegment),
  )

  console.log(`${PREFIX}${payloadSegment}.${bytesToBase64Url(new Uint8Array(signature))}`)
  console.error(`Plan: ${payload.plan}`)
  console.error(`Expires: ${payload.expiresAt}`)
}

function readArg(name) {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return null
  return process.argv[idx + 1] ?? null
}

function hasFlag(name) {
  return process.argv.includes(name)
}

async function fileExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function randomId() {
  const bytes = new Uint8Array(12)
  webcrypto.getRandomValues(bytes)
  return bytesToBase64Url(bytes)
}

function bytesToBase64Url(bytes) {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function usage() {
  console.error('Usage:')
  console.error('  pnpm license:keygen')
  console.error('  pnpm license:keygen -- --force')
  console.error('  pnpm license:issue -- --customer "Customer" --days 30')
  console.error('  pnpm license:issue -- --customer "Customer" --days 90 --plan pilot')
}
