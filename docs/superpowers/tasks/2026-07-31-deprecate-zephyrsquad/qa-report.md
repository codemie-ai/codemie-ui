# QA report — EPMCDME-10913 UI

**Branch**: EPMCDME-10913_deprecate-zephyrsquad
**Base**: origin/main
**Ran**: 2026-07-31

## Gates

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | PASS (no output) |
| Lint | `npm run lint` (eslint) | PASS |
| Full vitest suite | `npx vitest run` | PASS — 4424 tests / 363 files (1 pre-existing skip) |
| Gitleaks | Pre-commit hook | PASS (no leaks found) |
| Pre-commit gate | ran during both `git commit`s | PASS |
| test-harness | `npm run test-harness` (uvx codemie-test-harness --sanity-ui) | NOT RUN in this session; **MUST run before opening MR** — the codemie-ui compliance bot fails MRs without a green test-harness (per project memory) |

## Explicit scope trims

- **AC4 field-disable**: Field inputs on the Edit page remain interactive when the credential is deprecated. Save and Test Integration buttons are hidden, so there is no mutation path through the UI. A follow-up MR can plumb `disabled` through SettingsForm → CredentialFields if UX asks. This was called out in the review verdict and is documented in the spec's non-goals section.

## Test-harness reminder (mandatory before MR)

Per project memory, the codemie-ui compliance bot fails MRs opened without a green `test-harness` run. Do this before invoking mr-creator:

```
npm run test-harness
```

If it fails locally due to the known ZIP-indexing flake, apply the documented per-machine workaround (comment out the SEARCH_KB assertion; propagate to uvx caches).

## Summary

Backend + UI story is functionally complete. UI-side deprecation is thin (three source files touched net-net + one type addition + one test file). No new UI primitives, no store changes, no new API-client code. Existing pipelines (getCredentialMessage, SettingFormMessage, getErrorMessage → toast) do the heavy lifting.
