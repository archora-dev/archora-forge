import { cac } from 'cac'

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
import { registerProCommands } from './pro.js'
import { cliVersion } from './package-metadata.js'

export { createForgeConfigPreset, defineForgeConfig } from '@archora/forge-config'

export function createCli() {
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
  registerExplainCommand(cli)

  // Forge Intelligence (Pro) tier — license-gated team/CI layer.
  registerProCommands(cli)

  return cli
}

export async function runCli(argv = process.argv): Promise<void> {
  const cli = createCli()
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
