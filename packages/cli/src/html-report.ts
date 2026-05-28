type DiagnosticLike = {
  severity?: string
  code?: string
  message?: string
  location?: string
  suggestion?: string
}

type DriftLike = {
  path?: string
  kind?: string
}

type SchemaLike = {
  name?: string
  schema?: string
  configPath?: string | null
  healthScore?: number
  health?: { score?: number; endpointCount?: number; schemaCount?: number; tagCount?: number; crudCandidateCount?: number }
  resourceCount?: number
  resources?: unknown[] | number
  generatedFiles?: number
  protectedFiles?: number
  diagnosticsCount?: number
  failedChecks?: string[]
  coverage?: CoverageLike
}

type CoverageLike = {
  operations?: {
    total?: number
    generated?: number
    diagnosticOnly?: number
    byKind?: Record<string, number>
    byRequestShape?: Record<string, number>
    byResponseShape?: Record<string, number>
  }
  schemas?: {
    total?: number
    unsupportedConstructs?: Record<string, number>
  }
  cases?: {
    generated?: number
    skipped?: number
    fallback?: number
    diagnosticOnly?: number
  }
}

type HtmlReportPayload = {
  ok?: boolean
  schema?: string
  configPath?: string | null
  healthScore?: number
  health?: { score?: number; endpointCount?: number; schemaCount?: number; tagCount?: number; crudCandidateCount?: number }
  resources?: unknown[] | number
  resourceCount?: number
  generatedFiles?: number
  protectedFiles?: number
  failedChecks?: string[]
  readiness?: {
    status?: string
    decision?: string
    gate?: { result?: string; recommendedCiMode?: string; reason?: string }
    blockers?: string[]
    warnings?: string[]
    nextActions?: string[]
    reviewerChecklist?: string[]
  }
  drift?: DriftLike[]
  diagnostics?: DiagnosticLike[]
  schemas?: SchemaLike[]
  files?: { create?: number; update?: number; protected?: number }
  changes?: Array<{ severity?: string; code?: string; message?: string; location?: string }>
  affectedResources?: string[]
  affectedFiles?: string[]
  summary?: {
    breaking?: number
    warnings?: number
    nonBreaking?: number
    total?: number
  }
  decision?: {
    status?: string
    mergeRisk?: string
    reason?: string
  }
  impactedSurface?: {
    operationIds?: string[]
    clientMethods?: string[]
    queryHooks?: string[]
  }
  migrationHints?: string[]
  prSummary?: string
  resourceExplorer?: Array<{
    name?: string
    operations?: Array<{ id?: string; method?: string; path?: string; kind?: string }>
    generatedFiles?: string[]
  }>
  coverage?: CoverageLike
  sourceUsages?: Array<{
    path?: string
    matches?: string[]
    lines?: number[]
  }>
}

export function createHtmlReport(title: string, payload: HtmlReportPayload): string {
  const diagnostics = payload.diagnostics ?? []
  const drift = payload.drift ?? []
  const failedChecks = payload.failedChecks ?? []
  const healthScore = payload.healthScore ?? payload.health?.score ?? minDefined((payload.schemas ?? []).map((schema) => schema.healthScore ?? schema.health?.score))
  const resources = typeof payload.resources === 'number' ? payload.resources : payload.resourceCount ?? payload.resources?.length
  const status = payload.ok === false ? 'failed' : 'passed'
  const generatedFiles = payload.generatedFiles ?? sumDefined((payload.schemas ?? []).map((schema) => schema.generatedFiles))
  const topAffectedResources = collectAffectedResources(payload)
  const diagnosticsByCode = groupBy(diagnostics, (diagnostic) => diagnostic.code ?? 'diagnostic')
  const diagnosticsBySeverity = groupBy(diagnostics, (diagnostic) => diagnostic.severity ?? 'warning')
  const driftByCategory = groupBy(drift, (entry) => fileCategory(entry.path ?? ''))
  const unsupportedDiagnostics = diagnostics.filter((diagnostic) => (diagnostic.code ?? '').startsWith('unsupported-'))
  const ciSummary = [
    `Status: ${status}`,
    `Health: ${healthScore ?? 'n/a'}`,
    `Resources: ${resources ?? 'n/a'}`,
    `Generated files: ${generatedFiles ?? 'n/a'}`,
    `Diagnostics: ${diagnostics.length}`,
    `Drift: ${drift.length}`,
    `Failed checks: ${failedChecks.length > 0 ? failedChecks.join(', ') : 'none'}`,
  ].join('\n')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #17202a; background: #f6f7f9; }
    body { margin: 0; }
    main { max-width: 1120px; margin: 0 auto; padding: 32px 20px 48px; }
    h1, h2, h3 { margin: 0; line-height: 1.2; }
    h1 { font-size: 30px; }
    h2 { margin-top: 28px; font-size: 18px; }
    p { margin: 8px 0 0; color: #526071; }
    .top { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; }
    .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 6px 10px; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: .04em; }
    .passed { color: #0b6b3a; background: #dff7ea; }
    .failed { color: #9d2a1f; background: #ffe2dd; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-top: 18px; }
    .metric, .card { background: #fff; border: 1px solid #dfe4ea; border-radius: 8px; padding: 14px; box-shadow: 0 1px 2px rgba(23, 32, 42, .04); }
    .metric strong { display: block; font-size: 24px; color: #17202a; }
    .metric span, .muted { color: #667386; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; background: #fff; border: 1px solid #dfe4ea; border-radius: 8px; overflow: hidden; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #edf0f3; vertical-align: top; font-size: 14px; }
    th { background: #f0f3f6; color: #3f4b59; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
    tr:last-child td { border-bottom: 0; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; background: #eef2f6; padding: 2px 4px; border-radius: 4px; }
    .warning { color: #8a5a00; }
    .error { color: #a32116; }
    .summary { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(280px, .7fr); gap: 12px; margin-top: 18px; }
    .summary ul { margin: 10px 0 0; padding-left: 18px; }
    .summary li { margin: 6px 0; }
    .pill-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .pill { display: inline-flex; gap: 6px; align-items: center; border: 1px solid #dfe4ea; border-radius: 999px; padding: 5px 9px; background: #f8fafc; font-size: 12px; }
    details { background: #fff; border: 1px solid #dfe4ea; border-radius: 8px; margin-top: 12px; overflow: hidden; }
    summary { cursor: pointer; padding: 12px 14px; font-weight: 700; background: #f8fafc; }
    pre { white-space: pre-wrap; word-break: break-word; background: #17202a; color: #f6f7f9; border-radius: 8px; padding: 12px; font-size: 12px; margin: 12px 0 0; }
    .empty { background: #fff; border: 1px dashed #cad2dc; border-radius: 8px; padding: 16px; color: #667386; margin-top: 12px; }
    .footer { margin-top: 32px; font-size: 12px; color: #7a8797; }
  </style>
</head>
<body>
<main>
  <section class="top">
    <div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(payload.schema ?? 'Archora Forge CLI report')}</p>
    </div>
    <span class="badge ${status}">${status}</span>
  </section>

  <section class="grid">
    ${metric('Health', healthScore ?? 'n/a')}
    ${metric('Diagnostics', diagnostics.length)}
    ${metric('Failed checks', failedChecks.length)}
    ${metric('Drift', drift.length)}
    ${metric('Resources', resources ?? 'n/a')}
    ${metric('Generated files', generatedFiles ?? 'n/a')}
  </section>

  ${renderExecutiveSummary({ status, healthScore, resources, generatedFiles, diagnostics, drift, failedChecks, topAffectedResources })}
  ${renderReadiness(payload.readiness)}
  ${renderCiSummary(ciSummary)}
  ${renderGeneratedFileCategories(driftByCategory, payload.files, generatedFiles)}
  ${renderDiagnosticGroups(diagnosticsBySeverity, diagnosticsByCode)}
  ${renderUnsupportedOperations(unsupportedDiagnostics)}
  ${renderAffectedResources(topAffectedResources)}
  ${renderResourceExplorer(payload.resourceExplorer)}
  ${renderCoverageMatrix(payload.coverage)}
  ${renderImpactCenter(payload)}
  ${renderContractDiffSummary(payload)}
  ${renderSchemas(payload.schemas)}
  ${renderFailedChecks(failedChecks)}
  ${renderDiagnostics(diagnostics)}
  ${renderDrift(drift)}

  <p class="footer">Generated by Archora Forge CLI. Commit this report as a CI artifact or attach it to release validation notes.</p>
</main>
</body>
</html>
`
}

function renderReadiness(readiness: HtmlReportPayload['readiness']): string {
  if (!readiness) return ''
  return `<section class="summary">
    <div class="card">
      <h2>Pilot Readiness</h2>
      <p>Status: <strong>${escapeHtml(readiness.status ?? 'n/a')}</strong></p>
      ${
        readiness.gate
          ? `<p>Gate: <strong>${escapeHtml(readiness.gate.result ?? 'n/a')}</strong></p>
      <p>Recommended CI mode: <strong>${escapeHtml(readiness.gate.recommendedCiMode ?? 'n/a')}</strong></p>
      <p>${escapeHtml(readiness.gate.reason ?? '')}</p>`
          : ''
      }
      <p>${escapeHtml(readiness.decision ?? '')}</p>
    </div>
    <div class="card">
      <h2>Next Actions</h2>
      ${renderSimpleList(readiness.nextActions ?? [], 'No action required.')}
    </div>
    <div class="card">
      <h2>Blockers</h2>
      ${renderSimpleList(readiness.blockers ?? [], 'No blockers.')}
    </div>
    <div class="card">
      <h2>Warnings</h2>
      ${renderSimpleList(readiness.warnings ?? [], 'No warnings.')}
    </div>
    ${
      readiness.reviewerChecklist
        ? `<div class="card">
      <h2>Reviewer Checklist</h2>
      ${renderSimpleList(readiness.reviewerChecklist, 'No reviewer checklist.')}
    </div>`
        : ''
    }
  </section>`
}

function renderSimpleList(items: string[], empty: string): string {
  const values = items.length > 0 ? items : [empty]
  return `<ul>${values.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
}

function renderExecutiveSummary(input: {
  status: string
  healthScore: number | undefined
  resources: number | undefined
  generatedFiles: number | undefined
  diagnostics: DiagnosticLike[]
  drift: DriftLike[]
  failedChecks: string[]
  topAffectedResources: Array<{ name: string; count: number }>
}): string {
  const health = input.healthScore ?? 'n/a'
  const mainFinding =
    input.status === 'passed'
      ? 'Generated output is up to date for the configured checks.'
      : 'Generated output needs attention before this schema should pass CI.'
  const affected = input.topAffectedResources.length > 0 ? input.topAffectedResources.slice(0, 5).map((item) => `${item.name} (${item.count})`).join(', ') : 'none'
  return `<section class="summary">
    <div class="card">
      <h2>Executive Summary</h2>
      <ul>
        <li>${escapeHtml(mainFinding)}</li>
        <li>Health score: <strong>${escapeHtml(String(health))}</strong>.</li>
        <li>Resources: <strong>${escapeHtml(String(input.resources ?? 'n/a'))}</strong>; generated files: <strong>${escapeHtml(String(input.generatedFiles ?? 'n/a'))}</strong>.</li>
        <li>Diagnostics: <strong>${input.diagnostics.length}</strong>; drift entries: <strong>${input.drift.length}</strong>.</li>
        <li>Top affected resources: ${escapeHtml(affected)}.</li>
      </ul>
    </div>
    <div class="card">
      <h2>Decision Signal</h2>
      <p>${input.failedChecks.length === 0 ? 'Ready for CI under the current policy.' : `Blocked by: ${escapeHtml(input.failedChecks.join(', '))}.`}</p>
    </div>
  </section>`
}

function renderCiSummary(summary: string): string {
  return `<section><h2>Copyable CI Summary</h2><pre>${escapeHtml(summary)}</pre></section>`
}

function renderGeneratedFileCategories(groupedDrift: Map<string, DriftLike[]>, files: HtmlReportPayload['files'], generatedFiles: number | undefined): string {
  const pills = [
    generatedFiles !== undefined ? ['total generated', generatedFiles] : null,
    files?.create !== undefined ? ['create', files.create] : null,
    files?.update !== undefined ? ['update', files.update] : null,
    files?.protected !== undefined ? ['protected', files.protected] : null,
    ...[...groupedDrift.entries()].map(([name, entries]) => [name, entries.length] as [string, number]),
  ].filter((item): item is [string, number] => Boolean(item))
  if (pills.length === 0) return '<section><h2>Generated Files by Category</h2><div class="empty">No generated file summary available.</div></section>'
  return `<section><h2>Generated Files by Category</h2><div class="pill-list">${pills.map(([name, count]) => `<span class="pill"><strong>${escapeHtml(String(count))}</strong>${escapeHtml(name)}</span>`).join('')}</div></section>`
}

function renderDiagnosticGroups(bySeverity: Map<string, DiagnosticLike[]>, byCode: Map<string, DiagnosticLike[]>): string {
  if (bySeverity.size === 0 && byCode.size === 0) return '<section><h2>Diagnostics Grouped</h2><div class="empty">No diagnostics to group.</div></section>'
  return `<section><h2>Diagnostics Grouped</h2>
    <details open><summary>By severity</summary><div class="pill-list">${renderGroupPills(bySeverity)}</div></details>
    <details><summary>By code</summary><div class="pill-list">${renderGroupPills(byCode)}</div></details>
  </section>`
}

function renderUnsupportedOperations(diagnostics: DiagnosticLike[]): string {
  if (diagnostics.length === 0) return '<section><h2>Unsupported Operations</h2><div class="empty">No unsupported operations detected.</div></section>'
  const grouped = groupBy(diagnostics, (diagnostic) => diagnostic.code ?? 'unsupported')
  return `<section><h2>Unsupported Operations</h2><div class="pill-list">${renderGroupPills(grouped)}</div></section>`
}

function renderAffectedResources(resources: Array<{ name: string; count: number }>): string {
  if (resources.length === 0) return '<section><h2>Top Affected Resources</h2><div class="empty">No affected resources detected.</div></section>'
  return `<section><h2>Top Affected Resources</h2><div class="pill-list">${resources.slice(0, 20).map((item) => `<span class="pill"><strong>${item.count}</strong>${escapeHtml(item.name)}</span>`).join('')}</div></section>`
}

function renderResourceExplorer(resources: HtmlReportPayload['resourceExplorer']): string {
  if (!resources) return ''
  if (resources.length === 0) return '<section><h2>Resource Explorer</h2><div class="empty">No resources detected.</div></section>'
  const cards = resources
    .slice(0, 50)
    .map((resource) => {
      const operations = (resource.operations ?? [])
        .slice(0, 20)
        .map((operation) => `<li><code>${escapeHtml(`${operation.method?.toUpperCase() ?? ''} ${operation.path ?? ''}`.trim())}</code> ${escapeHtml(operation.id ?? '')} <span class="muted">${escapeHtml(operation.kind ?? '')}</span></li>`)
        .join('')
      const files = (resource.generatedFiles ?? []).slice(0, 12).map((file) => `<li><code>${escapeHtml(file)}</code></li>`).join('')
      return `<div class="card">
        <h3>${escapeHtml(resource.name ?? 'resource')}</h3>
        <p>${escapeHtml(String(resource.operations?.length ?? 0))} operations; ${escapeHtml(String(resource.generatedFiles?.length ?? 0))} generated files.</p>
        ${operations ? `<details><summary>Operations</summary><ul>${operations}</ul></details>` : ''}
        ${files ? `<details><summary>Generated files</summary><ul>${files}</ul></details>` : ''}
      </div>`
    })
    .join('')
  return `<section><h2>Resource Explorer</h2><div class="summary">${cards}</div></section>`
}

function renderCoverageMatrix(coverage: CoverageLike | undefined): string {
  if (!coverage) return ''
  return `<section>
    <h2>Schema Coverage Matrix</h2>
    <div class="grid">
      ${metric('Operations', coverage.operations?.total ?? 'n/a')}
      ${metric('Generated operations', coverage.operations?.generated ?? 'n/a')}
      ${metric('Fallback cases', coverage.cases?.fallback ?? 'n/a')}
      ${metric('Diagnostic-only cases', coverage.cases?.diagnosticOnly ?? 'n/a')}
      ${metric('Schemas', coverage.schemas?.total ?? 'n/a')}
      ${metric('Skipped operations', coverage.cases?.skipped ?? 'n/a')}
    </div>
    <details open><summary>Operation types</summary><div class="pill-list">${renderRecordPills(coverage.operations?.byKind)}</div></details>
    <details><summary>Request shapes</summary><div class="pill-list">${renderRecordPills(coverage.operations?.byRequestShape)}</div></details>
    <details><summary>Response shapes</summary><div class="pill-list">${renderRecordPills(coverage.operations?.byResponseShape)}</div></details>
    <details><summary>Unsupported schema constructs</summary><div class="pill-list">${renderRecordPills(coverage.schemas?.unsupportedConstructs)}</div></details>
  </section>`
}

function renderContractDiffSummary(payload: HtmlReportPayload): string {
  if (!payload.changes?.length && !payload.affectedResources?.length) {
    return '<section><h2>Contract Diff Summary</h2><div class="empty">No contract diff changes in this report.</div></section>'
  }
  const breaking = payload.changes?.filter((change) => change.severity === 'breaking').length ?? 0
  const nonBreaking = (payload.changes?.length ?? 0) - breaking
  return `<section><h2>Contract Diff Summary</h2><div class="card"><p>Breaking changes: <strong>${breaking}</strong>; non-breaking changes: <strong>${nonBreaking}</strong>; affected resources: <strong>${payload.affectedResources?.length ?? 0}</strong>.</p></div></section>`
}

function renderImpactCenter(payload: HtmlReportPayload): string {
  if (!payload.decision && !payload.summary && !payload.migrationHints?.length && !payload.prSummary) return ''
  return `<section>
    <h2>Frontend Impact Center</h2>
    <div class="summary">
      <div class="card">
        <h2>Decision</h2>
        <p>Status: <strong>${escapeHtml(payload.decision?.status ?? 'n/a')}</strong></p>
        <p>Merge risk: <strong>${escapeHtml(payload.decision?.mergeRisk ?? 'n/a')}</strong></p>
        <p>${escapeHtml(payload.decision?.reason ?? '')}</p>
      </div>
      <div class="card">
        <h2>Impact Counts</h2>
        <ul>
          <li>Breaking: <strong>${escapeHtml(String(payload.summary?.breaking ?? 0))}</strong></li>
          <li>Warnings: <strong>${escapeHtml(String(payload.summary?.warnings ?? 0))}</strong></li>
          <li>Non-breaking: <strong>${escapeHtml(String(payload.summary?.nonBreaking ?? 0))}</strong></li>
          <li>Affected files: <strong>${escapeHtml(String(payload.affectedFiles?.length ?? 0))}</strong></li>
        </ul>
      </div>
    </div>
    <details open><summary>PR Summary</summary><pre>${escapeHtml(payload.prSummary ?? '')}</pre></details>
    <details open><summary>Migration Hints</summary>${renderSimpleList(payload.migrationHints ?? [], 'No migration hints.')}</details>
    <details><summary>Impacted Surface</summary>
      <div class="card">
        <p>Operation IDs: ${escapeHtml(payload.impactedSurface?.operationIds?.join(', ') || 'none')}</p>
        <p>Client methods: ${escapeHtml(payload.impactedSurface?.clientMethods?.join(', ') || 'none')}</p>
        <p>Query hooks: ${escapeHtml(payload.impactedSurface?.queryHooks?.join(', ') || 'none')}</p>
      </div>
    </details>
    ${renderSourceUsages(payload.sourceUsages)}
  </section>`
}

function renderSourceUsages(usages: HtmlReportPayload['sourceUsages']): string {
  if (!usages) return ''
  if (usages.length === 0) return '<details open><summary>Source Usage</summary><div class="empty">No impacted source usages found.</div></details>'
  const rows = usages
    .slice(0, 100)
    .map((usage) => `<tr><td><code>${escapeHtml(`${usage.path ?? ''}${usage.lines?.length ? `:${usage.lines.join(',')}` : ''}`)}</code></td><td>${escapeHtml((usage.matches ?? []).join(', '))}</td></tr>`)
    .join('')
  return `<details open><summary>Source Usage</summary><table><thead><tr><th>File</th><th>Matches</th></tr></thead><tbody>${rows}</tbody></table></details>`
}

function renderSchemas(schemas: SchemaLike[] | undefined): string {
  if (!schemas?.length) return ''
  const rows = schemas
    .map((schema) => {
      const healthScore = schema.healthScore ?? schema.health?.score ?? 'n/a'
      const resources = typeof schema.resources === 'number' ? schema.resources : schema.resourceCount ?? schema.resources?.length ?? 'n/a'
      return `<tr><td>${escapeHtml(schema.name ?? 'default')}</td><td><code>${escapeHtml(schema.schema ?? '')}</code></td><td>${escapeHtml(String(healthScore))}</td><td>${escapeHtml(String(resources))}</td><td>${escapeHtml(String(schema.diagnosticsCount ?? 'n/a'))}</td></tr>`
    })
    .join('')
  return `<section><h2>Schemas</h2><table><thead><tr><th>Name</th><th>Schema</th><th>Health</th><th>Resources</th><th>Diagnostics</th></tr></thead><tbody>${rows}</tbody></table></section>`
}

function renderFailedChecks(failedChecks: string[]): string {
  if (failedChecks.length === 0) return '<section><h2>Failed Checks</h2><div class="empty">No failed checks.</div></section>'
  return `<section><h2>Failed Checks</h2><div class="card">${failedChecks.map((check) => `<code>${escapeHtml(check)}</code>`).join(' ')}</div></section>`
}

function renderDiagnostics(diagnostics: DiagnosticLike[]): string {
  if (diagnostics.length === 0) return '<section><h2>Diagnostics</h2><div class="empty">No diagnostics.</div></section>'
  const rows = diagnostics
    .slice(0, 200)
    .map(
      (diagnostic) =>
        `<tr><td class="${escapeHtml(diagnostic.severity ?? 'warning')}">${escapeHtml(diagnostic.severity ?? 'warning')}</td><td><code>${escapeHtml(diagnostic.code ?? 'diagnostic')}</code></td><td>${escapeHtml(diagnostic.location ?? '')}</td><td>${escapeHtml(diagnostic.message ?? '')}${diagnostic.suggestion ? `<p>${escapeHtml(diagnostic.suggestion)}</p>` : ''}</td></tr>`,
    )
    .join('')
  return `<section><h2>Diagnostics</h2><table><thead><tr><th>Severity</th><th>Code</th><th>Location</th><th>Message</th></tr></thead><tbody>${rows}</tbody></table></section>`
}

function renderDrift(drift: DriftLike[]): string {
  if (drift.length === 0) return '<section><h2>Drift</h2><div class="empty">No drift detected.</div></section>'
  const rows = drift.map((entry) => `<tr><td><code>${escapeHtml(entry.path ?? '')}</code></td><td>${escapeHtml(entry.kind ?? '')}</td></tr>`).join('')
  return `<section><h2>Drift</h2><table><thead><tr><th>Path</th><th>Kind</th></tr></thead><tbody>${rows}</tbody></table></section>`
}

function metric(label: string, value: string | number): string {
  return `<div class="metric"><strong>${escapeHtml(String(value))}</strong><span>${escapeHtml(label)}</span></div>`
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function minDefined(values: Array<number | undefined>): number | undefined {
  const defined = values.filter((value): value is number => value !== undefined)
  return defined.length > 0 ? Math.min(...defined) : undefined
}

function sumDefined(values: Array<number | undefined>): number | undefined {
  const defined = values.filter((value): value is number => value !== undefined)
  return defined.length > 0 ? defined.reduce((total, value) => total + value, 0) : undefined
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const group = key(item)
    groups.set(group, [...(groups.get(group) ?? []), item])
  }
  return groups
}

function renderGroupPills(groups: Map<string, unknown[]>): string {
  return [...groups.entries()]
    .sort((left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0]))
    .map(([name, items]) => `<span class="pill"><strong>${items.length}</strong>${escapeHtml(name)}</span>`)
    .join('')
}

function renderRecordPills(record: Record<string, number> | undefined): string {
  if (!record || Object.keys(record).length === 0) return '<span class="muted">none</span>'
  return Object.entries(record)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([name, count]) => `<span class="pill"><strong>${count}</strong>${escapeHtml(name)}</span>`)
    .join('')
}

function collectAffectedResources(payload: HtmlReportPayload): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>()
  for (const resource of payload.affectedResources ?? []) {
    counts.set(resource, (counts.get(resource) ?? 0) + 1)
  }
  for (const diagnostic of payload.diagnostics ?? []) {
    const resource = resourceFromLocation(diagnostic.location)
    if (resource) counts.set(resource, (counts.get(resource) ?? 0) + 1)
  }
  for (const entry of payload.drift ?? []) {
    const resource = resourceFromPath(entry.path)
    if (resource) counts.set(resource, (counts.get(resource) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
}

function resourceFromLocation(location: string | undefined): string | null {
  const path = location?.match(/[A-Z]+\s+([^\s]+)/)?.[1]
  if (!path) return null
  return path.split('/').filter(Boolean).filter((segment) => !segment.startsWith('{') && !/^v\d+$/i.test(segment)).at(-1) ?? null
}

function resourceFromPath(path: string | undefined): string | null {
  if (!path) return null
  const feature = path.match(/src\/features\/([^/]+)/)?.[1]
  if (feature) return feature
  return path.match(/src\/shared\/api\/generated\/([^/]+)/)?.[1] ?? null
}

function fileCategory(path: string): string {
  if (path.includes('/features/') && path.includes('/api/')) return 'feature api'
  if (path.includes('/features/') && path.includes('/model/')) return 'feature model'
  if (path.includes('/shared/api/generated/')) return 'api generated'
  if (path.includes('/shared/mocks/')) return 'mocks'
  return 'other'
}
