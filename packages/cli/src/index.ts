import { cac } from 'cac'

import { registerAuditCommand } from './commands/audit.command.js'
import { registerCheckCommand } from './commands/check.command.js'
import { registerContractDiffCommand } from './commands/contract-diff.command.js'
import { registerDiffCommand } from './commands/diff.command.js'
import { registerDoctorCommand } from './commands/doctor.command.js'
import { registerGenerateCommand } from './commands/generate.command.js'
import { registerInitCommand } from './commands/init.command.js'
import { registerInspectCommand } from './commands/inspect.command.js'
import { registerLintCommand } from './commands/lint.command.js'
import { registerValidateCommand } from './commands/validate.command.js'
import { cliVersion } from './package-metadata.js'

export { createForgeConfigPreset, defineForgeConfig } from '@archora/forge-config'

export function createCli() {
  const cli = cac('archora-forge')

  cli.version(cliVersion)
  cli.help()

  registerInitCommand(cli)
  registerAuditCommand(cli)
  registerGenerateCommand(cli)
  registerInspectCommand(cli)
  registerValidateCommand(cli)
  registerDiffCommand(cli)
  registerLintCommand(cli)
  registerCheckCommand(cli)
  registerContractDiffCommand(cli)
  registerDoctorCommand(cli)

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

const isDirectRun = process.argv[1]?.endsWith('/archora-forge') || process.argv[1]?.endsWith('/index.js')

if (isDirectRun) {
  void runCli()
}
