import { defineConfig } from 'vitepress'

export default defineConfig({
  base: process.env.VITEPRESS_BASE ?? '/',
  title: 'Archora Forge',
  description: 'Local-first OpenAPI to typed frontend resource contract generator',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/introduction' },
      { text: 'CLI', link: '/cli' },
      { text: 'GitHub', link: 'https://github.com/archora-dev/archora-forge' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Introduction', link: '/introduction' },
          { text: 'Installation', link: '/installation' },
          { text: 'Quick Start', link: '/quick-start' },
          { text: 'Roadmap', link: '/roadmap' },
          { text: 'CLI', link: '/cli' },
          { text: 'Configuration', link: '/configuration' },
          { text: 'API Stability', link: '/api-stability' },
          { text: 'OpenAPI Requirements', link: '/openapi-requirements' },
          { text: 'Diagnostics', link: '/diagnostics' },
          { text: 'OpenAPI Linting', link: '/openapi-linting' },
          { text: 'Contract Diff', link: '/contract-diff' },
          { text: 'Remote Schema Loading', link: '/remote-schema-loading' },
          { text: 'Resource Detection', link: '/resource-detection' },
          { text: 'Generated Output', link: '/generated-output' },
          { text: 'Generated File Contract', link: '/generated-file-contract' },
          { text: 'Runtime Client', link: '/runtime-client' },
          { text: 'Auth Basics', link: '/auth-basics' },
          { text: 'Customization', link: '/customization' },
          { text: 'Type-safe Generation', link: '/type-safe-generation' },
          { text: 'Schema-driven Forms', link: '/schema-driven-forms' },
          { text: 'Schema-driven Tables', link: '/schema-driven-tables' },
          { text: 'UI-kit Integration', link: '/ui-kit-integration' },
          { text: 'Regeneration Safety', link: '/regeneration-safety' },
          { text: 'Mocks', link: '/mocks' },
          { text: 'Permissions', link: '/permissions' },
          { text: 'i18n', link: '/i18n' },
          { text: 'Comparison', link: '/comparison' },
          { text: 'Troubleshooting', link: '/troubleshooting' },
          { text: 'Limitations', link: '/limitations' },
          { text: 'CI Mode', link: '/ci' },
        ],
      },
      {
        text: 'Evaluate',
        items: [
          { text: 'Evaluate in 30 Minutes', link: '/evaluate-in-30-minutes' },
          { text: 'Public Demo Walkthrough', link: '/public-demo-walkthrough' },
          { text: 'Why Forge', link: '/why-forge' },
          { text: 'Private Schema Workflow', link: '/private-schema-workflow' },
          { text: 'Paid Pilot Package', link: '/paid-pilot-package' },
        ],
      },
      {
        text: 'Tutorials',
        items: [
          { text: 'Private Schema CI', link: '/tutorials/private-schema-ci' },
          { text: 'Multi-schema Monorepo', link: '/tutorials/multi-schema-monorepo' },
        ],
      },
      {
        text: 'Experimental',
        items: [
          { text: 'Validation Generation', link: '/validation-generation' },
          { text: 'Multi-schema Workspace', link: '/multi-schema-workspace' },
        ],
      },
    ],
  },
})
