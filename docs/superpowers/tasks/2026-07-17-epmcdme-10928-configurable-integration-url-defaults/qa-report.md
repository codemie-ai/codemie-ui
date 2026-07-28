# QA Gate Report — epmcdme-10928-configurable-integration-url-defaults

**Branch**: EPMCDME-10928_configurable-integration-url-defaults
**Runner**: npm (guide-first via .ai-run/guides/quality-gates.md)
**Started**: 2026-07-20
**Status**: PASSED

## Gates

| Gate | Status | Command | Notes |
|---|---|---|---|
| lint | SKIPPED (pre-existing) | `npm run lint` | 655 errors in `.js` files (`menu-button-links.js`, `rfc4648.js`, etc.) — zero `.js` files in this branch's diff. All failures are pre-existing and unrelated to this change. Our `.ts`/`.tsx` changes are clean. |
| typecheck | PASS | `npm run typecheck` | Silent output, exit 0. |
| unit tests | PASS | `npm run test:unit` | All suites pass, exit 0. Pre-existing React ref stderr warnings unrelated to this branch. |
| integration tests | PASS | `npm run test:integration` | All suites pass, exit 0. Pre-existing `NewAssistantPage` stderr noise unrelated to this branch. |

## Failure detail

Lint failures are 100% pre-existing in vendored/Keycloak JS files not touched by this branch:
- `menu-button-links.js`, `rfc4648.js`, `kcMultivalued.js`, `webauthnRegister.js`, `webauthnAuthenticate.js`, `passkeysConditionalAuth.js`, `authChecker.js`, `common.js`, `kcNumberFormat.js`, `userProfile.js`
- `git diff main...HEAD --name-only` returns zero `.js` files.

## Drift signal

no
