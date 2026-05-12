import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

execFileSync('pnpm', ['--filter', 'vue-admin', 'build'], { stdio: 'inherit' })

const html = readFileSync('examples/vue-admin/dist/index.html', 'utf8')
if (!html.includes('src=') && !html.includes('href=')) {
  throw new Error('vue-admin build did not produce linked assets in index.html')
}

console.log('Vue admin demo smoke passed')
