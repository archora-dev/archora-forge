# Archora Forge sale-readiness tasks

Рабочий список для доведения Forge до продаваемого продукта без лишней обертки.

Цель: продавать Forge как локальный frontend API impact gate для OpenAPI-изменений: PR impact, audit package, typed resource layer, CI checks.

## Правила выполнения

- После завершения пункта менять `[ ]` на `[x]`.
- Не обещать hosted SaaS, full OpenAPI coverage или production UI generation.
- Для публичных текстов писать прямо: что делает, кому нужно, где границы.
- Для user-facing правок обновлять docs рядом с README.
- Для code changes запускать минимальные проверки.

## Phase A: License and sales path

- [x] A1. Сравнить licensing flow с соседним `archora`.
- [x] A2. Сравнить продающий сайт с соседним `archora-site`.
- [x] A3. Выравнять `COMMERCIAL-LICENSE.md` под ручную коммерческую лицензию как в `archora`.
- [x] A4. Убрать из docs обещание полноценного self-serve checkout.
- [x] A5. Исправить install-команды на реальные package names.
- [x] A6. Добавить локальный скрипт выдачи signed trial keys для пилотов.

## Phase B: Site handoff

- [x] B1. Сформировать список правок для `archora-site` по странице Forge.
- [x] B2. Обновить Forge positioning: не generator, а API impact review before merge.
- [x] B3. Проверить, что сайт не обещает SaaS, telemetry, full UI generation или unlimited OpenAPI coverage.

## Phase C: Product packaging

- [x] C1. Сжать buyer path до двух команд: `impact` и `audit`.
- [x] C2. Сделать paid pilot package главным sales artifact.
- [x] C3. Поднять public reports как proof: impact, audit, generated tree.
- [x] C4. Выделить no-go criteria до покупки.

## Phase D: Verification

- [x] D1. Запустить релевантные проверки после правок.
- [x] D2. Проверить `git status --short`.

## Phase E: CLI license activation

- [x] E1. Спроектировать CLI license UX: `license activate`, `license status`, `license remove`.
- [x] E2. Добавить проверку signed license key в CLI по public key.
- [x] E3. Добавить локальное хранение ключа вне репозитория пользователя.
- [x] E4. Добавить понятный prompt/error для коммерческих команд без активной лицензии.
- [x] E5. Оставить public preview/evaluation команды доступными по выбранной политике.
- [x] E6. Покрыть license activation тестами и docs.

## Phase F: Copy polish

- [x] F1. Убрать старое `self-serve` из CLI audit description и generated audit copy.
- [x] F2. Проверить, что оставшиеся `generator` упоминания используются только для сравнения, metadata или ограничений.

## Phase G: Must-have product features

- [x] G1. Добавить `pilot` command: одна команда собирает impact, audit и go/no-go package.
- [x] G2. Добавить `go-no-go.md` как итоговый decision artifact.
- [x] G3. Добавить `ci init github` для быстрого PR impact workflow.
- [x] G4. Добавить docs для `pilot` и `ci init github`.
- [x] G5. Покрыть новые команды тестами.

## Phase H: Must-have workflow polish

- [x] H1. Добавить `license request` для безопасной заявки на trial/pilot key.
- [x] H2. Добавить `impact --base <ref>` для сравнения текущей схемы с git base.
- [x] H3. Добавить `pilot --base <ref>` для pilot package без ручного `openapi.old.yaml`.
- [x] H4. Добавить `demo --out <path>` для self-contained impact demo.
- [x] H5. Добавить `explain <diagnostic-code>` и `explain --list`.
- [x] H6. Усилить `ci init github` параметрами `--schema`, `--base`, `--mode`.
- [x] H7. Обновить CLI docs, install/trial path, start guide и demo docs.
