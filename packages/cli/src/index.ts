import { cac } from 'cac'

import { registerCheckCommand } from './commands/check.command.js'
import { registerContractDiffCommand } from './commands/contract-diff.command.js'
import { registerDiffCommand } from './commands/diff.command.js'
import { registerGenerateCommand } from './commands/generate.command.js'
import { registerInitCommand } from './commands/init.command.js'
import { registerInspectCommand } from './commands/inspect.command.js'
import { registerLintCommand } from './commands/lint.command.js'
import { registerValidateCommand } from './commands/validate.command.js'

export function createCli() {
  const cli = cac('archora-forge')

  cli.version('0.0.0')
  cli.help()

  registerInitCommand(cli)
  registerGenerateCommand(cli)
  registerInspectCommand(cli)
  registerValidateCommand(cli)
  registerDiffCommand(cli)
  registerLintCommand(cli)
  registerCheckCommand(cli)
  registerContractDiffCommand(cli)

  return cli
}

export function runCli(argv = process.argv): void {
  createCli().parse(argv)
}

const isDirectRun = process.argv[1]?.endsWith('/archora-forge') || process.argv[1]?.endsWith('/index.js')

if (isDirectRun) {
  runCli()
}
