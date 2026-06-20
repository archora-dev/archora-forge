import { createTeamForgePreset } from './preset'

// A consuming repo extends the shared preset and overrides only what it needs.
export default createTeamForgePreset({
  input: './openapi.yaml',
  target: { query: 'tanstack-query' },
})
