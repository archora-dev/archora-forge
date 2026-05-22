# Competitive Positioning

Forge is not trying to replace every OpenAPI generator.

The product position is narrower:

> OpenAPI to frontend resource contract, with adoption reports and PR impact review.

## Compared with SDK Generators

SDK generators usually stop at:

- request methods;
- response types;
- sometimes query integration.

Forge adds the frontend resource layer around that:

- query keys;
- operation helpers;
- form and table metadata;
- permissions;
- labels;
- mocks;
- drift checks;
- adoption audit;
- contract impact reports;
- repo usage scan.

## Compared with Hand-written API Layers

Hand-written API layers give full control, but they drift:

- endpoint paths diverge from OpenAPI;
- payload types become stale;
- query keys are inconsistent;
- mocks lag behind the backend;
- API changes are discovered during manual testing.

Forge keeps the generated contract reviewable and lets the application keep its UI, routing, state and business behavior.

## Best Fit

Forge fits frontend teams that:

- consume OpenAPI contracts;
- commit generated TypeScript;
- care about pull-request review;
- want local-first private schema handling;
- already have a framework and design system.

It is not the right tool when the team wants a full app generator, hosted schema registry or generated production screens.
