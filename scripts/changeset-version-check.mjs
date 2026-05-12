import { accessSync } from 'node:fs'

const required = ['.changeset/config.json', '.changeset/README.md']

for (const file of required) {
  accessSync(file)
}

console.log('Preview changeset configuration is present. Run a real Changesets version step only when preparing a tagged preview release.')
