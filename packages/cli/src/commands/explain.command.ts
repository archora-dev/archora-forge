import type { CAC } from 'cac'

import { diagnosticExplanations, findDiagnosticExplanation } from '../diagnostic-explanations.js'
import { logger } from '../ui/logger.js'

type ExplainOptions = {
  list?: boolean
  json?: boolean
}

export function registerExplainCommand(cli: CAC): void {
  cli.command('explain [code]', 'Explain a Forge diagnostic code')
    .option('--list', 'List known diagnostic codes')
    .option('--json', 'Print machine-readable JSON')
    .action((code: string | undefined, options: ExplainOptions) => {
      if (options.list) {
        const payload = { diagnostics: diagnosticExplanations }
        if (options.json) console.log(JSON.stringify(payload, null, 2))
        else for (const diagnostic of diagnosticExplanations) logger.line(`${diagnostic.code} - ${diagnostic.title}`)
        return
      }

      if (!code) throw new Error('Missing diagnostic code. Use archora-forge explain <code> or archora-forge explain --list.')
      const explanation = findDiagnosticExplanation(code)
      if (!explanation) throw new Error(`Unknown diagnostic code "${code}". Run archora-forge explain --list.`)

      if (options.json) {
        console.log(JSON.stringify({ diagnostic: explanation }, null, 2))
        return
      }

      logger.title()
      logger.line(`${explanation.code}: ${explanation.title}`)
      logger.line('')
      logger.line('What happened')
      logger.line(explanation.whatHappened)
      logger.line('')
      logger.line('Why it matters')
      logger.line(explanation.whyItMatters)
      logger.line('')
      logger.line('How to fix')
      logger.line(explanation.howToFix)
      logger.line('')
      logger.line('Pilot impact')
      logger.line(explanation.pilotImpact)
    })
}
