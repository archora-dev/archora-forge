import { cac } from 'cac'

import { registerAdoptionCommand } from './commands/adoption.command.js'
import { registerDemoCommand } from './commands/demo.command.js'
import { registerDiffCommand } from './commands/diff.command.js'
import { registerDoctorCommand } from './commands/doctor.command.js'
import { registerExplainCommand } from './commands/explain.command.js'
import { registerGenerateCommand } from './commands/generate.command.js'
import { registerInitCommand } from './commands/init.command.js'
import { registerLicenseCommand } from './commands/license.command.js'
import { registerInspectCommand } from './commands/inspect.command.js'
import { registerLintCommand } from './commands/lint.command.js'
import { registerValidateCommand } from './commands/validate.command.js'
import { cliVersion } from './package-metadata.js'
import type { CAC } from 'cac'

export { createForgeConfigPreset, defineForgeConfig } from '@archora/forge-config'

export async function createCli(): Promise<CAC> {
  const cli = cac('archora-forge')

  cli.version(cliVersion)
  cli.help()

  // Free tier — the generator. No license required.
  registerInitCommand(cli)
  registerLicenseCommand(cli)
  registerGenerateCommand(cli)
  registerInspectCommand(cli)
  registerValidateCommand(cli)
  registerDiffCommand(cli)
  registerLintCommand(cli)
  registerDoctorCommand(cli)
  registerDemoCommand(cli)
  registerAdoptionCommand(cli)
  registerExplainCommand(cli)

  // Forge Intelligence (Pro) tier — the commercial team/CI layer. It ships as a separate
  // @archora/forge-pro package, loaded only when installed; the free generator runs alone.
  await registerProCommandsIfAvailable(cli)

  return cli
}

async function registerProCommandsIfAvailable(cli: CAC): Promise<void> {
  // The specifier is kept out of the literal import so the free CLI type-checks and bundles
  // without the optional Pro package present; it is resolved at runtime only when installed.
  const proPackage = '@archora/forge-pro'
  try {
    const pro = (await import(proPackage)) as {
      registerProCommands: (cli: CAC) => void
    }
    pro.registerProCommands(cli)
  } catch {
    // @archora/forge-pro is not installed — run the free generator tier only.
  }
}

export async function runCli(argv = process.argv): Promise<void> {
  const cli = await createCli()
  try {
    cli.parse(argv, { run: false })
    await cli.runMatchedCommand()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (argv.includes('--json')) {
      console.log(JSON.stringify({ ok: false, error: message }, null, 2))
    } else {
      console.error(message)
    }
    process.exitCode = 2
  }
}

const isDirectRun =
  process.argv[1]?.endsWith('/archora-forge') || process.argv[1]?.endsWith('/index.js')

if (isDirectRun) {
  void runCli()
}
