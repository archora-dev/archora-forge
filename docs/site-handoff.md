# Archora site handoff

Status: completed and historical. The live Forge page has already been updated in `archora-site`.

Правки для соседнего проекта `archora-site`.

## Forge page

Файл: `src/pages/forge/ForgePage.vue`.

Что оставить:

- главный тезис: `Review frontend API impact before an OpenAPI change lands`;
- локальный запуск, без hosted SaaS;
- tabs: Overview, Playground, Generated shape, Reports, Adapters, License;
- baked fixtures: Public CRM, Petstore, Mini E-commerce.

Что поправить:

- в License tab заменить старый contact-form wording на ручной license request через `akotov@archora.dev` и `@akotofff`;
- убрать широкую формулировку про modification rights; оставить только permitted internal modifications внутри licensed organization;
- добавить короткий paid pilot текст: one schema, local audit, generated output, impact report, go/no-go;
- в CLI snippet оставить две главные команды первыми:

```bash
archora-forge impact openapi.yaml --base origin/main --repo . --pr-comment-file .forge/impact-pr.md
archora-forge pilot openapi.yaml --base origin/main --repo . --out .forge/pilot
```

## Home page

Файл: `src/pages/home/HomePage.vue`.

Что поправить:

- основной CTA для Forge: `Review API impact`;
- не продавать Forge как generic codegen;
- оставить proof через baked generated files and reports;
- local-first и private-by-default оставить без изменений.

## Product metadata

Файл: `src/entities/product/index.ts`.

Текущий blurb хороший:

`Frontend contract review for OpenAPI changes: typed output, drift checks, audit packs, and PR impact.`

Можно усилить bullet:

- `impact and audit as first-run workflow`;
- `manual paid license, local evaluation first`;
- `no hosted schema upload`.

## Copy limits

Не обещать:

- full OpenAPI coverage;
- generated production screens;
- hosted schema registry;
- automatic checkout;
- unlimited production support.
