export type DiagnosticExplanation = {
  code: string
  title: string
  whatHappened: string
  whyItMatters: string
  howToFix: string
  pilotImpact: 'blocker' | 'review' | 'usually-ok'
}

export const diagnosticExplanations: DiagnosticExplanation[] = [
  {
    code: 'unsupported-operation',
    title: 'Unsupported operation shape',
    whatHappened: 'Forge preserved the endpoint but did not generate it as a normal typed resource operation.',
    whyItMatters: 'Frontend code may still need a custom client call for this endpoint.',
    howToFix: 'Use a supported HTTP method with JSON-compatible request and response schemas, or keep this endpoint in custom code.',
    pilotImpact: 'review',
  },
  {
    code: 'unsupported-content-type',
    title: 'Unsupported content type',
    whatHappened: 'The operation uses a request or response content type that Forge does not type as JSON.',
    whyItMatters: 'Generated request or response types may fall back to broader types.',
    howToFix: 'Add an application/json schema when the endpoint returns JSON, or keep binary/plain endpoints in custom code.',
    pilotImpact: 'review',
  },
  {
    code: 'missing-request-schema',
    title: 'Missing request schema',
    whatHappened: 'The operation has a request body but no supported JSON request schema.',
    whyItMatters: 'Generated request typing cannot protect callers from sending the wrong payload shape.',
    howToFix: 'Add an application/json request body schema in OpenAPI.',
    pilotImpact: 'review',
  },
  {
    code: 'missing-response-schema',
    title: 'Missing response schema',
    whatHappened: 'The operation has no supported 2xx JSON response schema.',
    whyItMatters: 'Generated response typing and UI metadata may be incomplete.',
    howToFix: 'Add an application/json 2xx response schema.',
    pilotImpact: 'review',
  },
  {
    code: 'unsupported-header-parameter',
    title: 'Unsupported header parameter',
    whatHappened: 'The endpoint models a header parameter that generated method signatures do not include yet.',
    whyItMatters: 'Callers must pass this value through runtime client configuration or custom code.',
    howToFix: 'Move auth/common headers to runtime client headers. Keep operation-specific headers in custom code until header generation is expanded.',
    pilotImpact: 'review',
  },
  {
    code: 'unsupported-cookie-parameter',
    title: 'Unsupported cookie parameter',
    whatHappened: 'The endpoint models a cookie parameter that generated method signatures do not include yet.',
    whyItMatters: 'Generated clients will not expose this cookie value as a typed argument.',
    howToFix: 'Handle cookie state at the runtime/client layer or keep this endpoint outside generated adoption scope.',
    pilotImpact: 'review',
  },
  {
    code: 'unsupported-operation-security',
    title: 'Operation-level security not generated',
    whatHappened: 'The endpoint has operation-level security requirements.',
    whyItMatters: 'Generated calls still need runtime auth configuration.',
    howToFix: 'Configure auth through runtime headers/getHeaders and verify the endpoint in the pilot report.',
    pilotImpact: 'usually-ok',
  },
  {
    code: 'unsupported-security-schemes',
    title: 'Unsupported security scheme',
    whatHappened: 'The OpenAPI document declares a security scheme Forge does not generate directly.',
    whyItMatters: 'Authentication must be wired through runtime client configuration.',
    howToFix: 'Use supported bearer, OAuth2 or header apiKey schemes where possible, or configure auth at runtime.',
    pilotImpact: 'usually-ok',
  },
  {
    code: 'unsupported-oneof',
    title: 'Unsupported oneOf composition',
    whatHappened: 'A schema uses oneOf in a shape Forge reports but does not deeply model yet.',
    whyItMatters: 'Generated types may fall back to a broader union, especially for discriminator-driven payloads.',
    howToFix: 'Prefer a concrete response shape for generated v1 adoption, or validate generated fallback types before rollout.',
    pilotImpact: 'review',
  },
  {
    code: 'unsupported-anyof',
    title: 'Unsupported anyOf composition',
    whatHappened: 'A schema uses anyOf in a shape Forge reports but does not deeply model yet.',
    whyItMatters: 'Generated types may be broader than the real runtime contract.',
    howToFix: 'Use a concrete object schema for generated adoption or keep this model in custom code.',
    pilotImpact: 'review',
  },
  {
    code: 'unsupported-allof',
    title: 'Unsupported allOf composition',
    whatHappened: 'A schema uses allOf that Forge cannot safely merge.',
    whyItMatters: 'Generated types may not represent the exact composed contract.',
    howToFix: 'Flatten the schema or simplify allOf branches to mergeable object shapes.',
    pilotImpact: 'review',
  },
  {
    code: 'conflicting-allof',
    title: 'Conflicting allOf composition',
    whatHappened: 'A schema has allOf branches that define incompatible property shapes.',
    whyItMatters: 'The OpenAPI contract is ambiguous for generated TypeScript and should not be accepted silently.',
    howToFix: 'Fix the conflicting property definitions or publish an explicit concrete schema.',
    pilotImpact: 'blocker',
  },
  {
    code: 'unsupported-discriminator',
    title: 'Unsupported discriminator',
    whatHappened: 'A schema uses discriminator-based polymorphism.',
    whyItMatters: 'Generated union narrowing will not reflect discriminator semantics yet.',
    howToFix: 'Avoid discriminator-dependent generation for v1 adoption or validate fallback types carefully.',
    pilotImpact: 'review',
  },
]

export function findDiagnosticExplanation(code: string): DiagnosticExplanation | undefined {
  return diagnosticExplanations.find((entry) => entry.code === code)
}
