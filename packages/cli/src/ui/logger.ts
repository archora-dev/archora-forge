import pc from 'picocolors'

export function printPendingPhaseMessage(command: string, detail: string): void {
  console.log(pc.bold('Archora Forge'))
  console.log(`${pc.cyan(command)} is wired, but ${detail}.`)
}

export const logger = {
  title(): void {
    console.log(pc.bold('Archora Forge'))
  },
  line(message = ''): void {
    console.log(message)
  },
  success(message: string): void {
    console.log(`${pc.green('✓')} ${message}`)
  },
  warn(message: string): void {
    console.log(`${pc.yellow('-')} ${message}`)
  },
  error(message: string): void {
    console.error(`${pc.red('x')} ${message}`)
  },
}
