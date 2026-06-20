import type { CAC } from 'cac'

import { registerAuditCommand } from './commands/audit.command.js'
import { registerCheckCommand } from './commands/check.command.js'
import { registerCiCommand } from './commands/ci.command.js'
import { registerContractDiffCommand } from './commands/contract-diff.command.js'
import { registerPilotCommand } from './commands/pilot.command.js'

/**
 * Forge Intelligence (Pro) command tier.
 *
 * Everything registered here is the paid, team/CI layer that operates on top
 * of the free generator: impact reporting, the CI readiness gate, adoption
 * audits and pilot reporting. These commands are license-gated at runtime via
 * `requireCommercialLicense` inside each command action.
 *
 * This module is the single extraction seam: moving it (and the command files
 * it imports) into a standalone `@archora/forge-pro` package later requires no
 * changes to the free CLI other than swapping this import for a dynamic load.
 */
export function registerProCommands(cli: CAC): void {
  registerPilotCommand(cli)
  registerCiCommand(cli)
  registerAuditCommand(cli)
  registerCheckCommand(cli)
  registerContractDiffCommand(cli)
}
