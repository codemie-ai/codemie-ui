# QA report — EPMCDME-13983 Dynamic Customer Configuration

Branch: `feature/EPMCDME-13983-dynamic-customer-config` (codemie and codemie-ui).

## Backend — `codemie`

| Gate | Command | Result |
|---|---|---|
| Lint and format | `make ruff` | **pass** — `ruff check --fix` then `ruff check`, all checks passed |
| Build | `make build` | **pass** — sdist and wheel built (`codemie-0.8.0`) |
| License headers | `make license-check` | **pass** — 2056 files checked, 0 missing |
| Secret scan | `make gitleaks` | **pass for this change** — scanned 63.55 MB (a real scan, not a zero-byte no-op). 4 findings, all in untracked local files (`.env`, `.env.bak-llmmode-124709`, `.env.pre-main-switch`) that are not part of the branch; no finding in a tracked file |
| Tests | `make test` | **14635 passed, 47 failed, 177 skipped** — every failure is pre-existing and environmental, see below |

### The 47 test failures

All of them come from `codemie_enterprise` not being installed in this local environment:
30 raise `ModuleNotFoundError: No module named 'codemie_enterprise'` directly, and the rest are its
downstream effects in the same suites (`503 Service Unavailable` from the enterprise bridges,
`'NoneType' object has no attribute 'retry_auth_headers'`). One further failure,
`test_oauth_redis_lazy_init`, asserts that the SharePoint PKCE service holds no Redis client and
fails because the local stack's Redis is reachable.

None of the failing modules import `customer_config`, and the change touches no MCP-auth,
SharePoint or Redis code. Feature-scoped verification below is the meaningful signal.

### Feature-scoped backend suites

`tests/codemie/service/test_customer_config_declarations.py`,
`test_customer_config_service.py`, `test_customer_config_validation.py`,
`test_customer_config_audit.py`, `test_dynamic_config_service.py`,
`tests/codemie/configs/test_customer_config.py`,
`tests/codemie/rest_api/routers/test_customer_config_router.py`,
`test_dynamic_config_router.py`,
`tests/codemie/rest_api/security/test_customer_config_write_guard.py`
→ **215 passed**.

## Frontend — `codemie-ui`

| Gate | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | **pass** — no errors |
| Lint | `npx eslint <changed paths>` | **pass** — no real findings; the only output is the repository's known-broken `@/` alias resolver reporting `import/no-unresolved` on every aliased import, including on untouched files |
| Unit tests | `npx vitest run` over changed areas | **1085 passed** across 134 files |
| Integration tests | `npx vitest run --project integration` | **7 passed** (request bodies against the real API client, disclaimer reactivity against the real valtio proxy) |

`make test-harness` was not run: it is the MR-compliance gate and belongs to MR creation, which has
not been requested.

## Adversarial verification of the review fixes

Two fixes were confirmed by reintroducing the original defect and checking the new test fails:

- **Request body shape** — restoring `api.put(url, { json: { settings } })` fails 2 of the 4 new
  integration cases; the fixed form passes all 4.
- **Disclaimer reactivity** — a render-counting probe against the real valtio proxy showed the
  component re-renders even with the snapshot discarded (1 → 2), which refuted the reported bug
  rather than confirming it. Recorded as dismissed, not fixed.

## Post-review addition

A page-level `Reset all to default` control was added to the header at the user's request after the
review round, covered by six new cases (resets every overridden setting, skips defaults, refreshes
the app config, disabled with nothing to reset, absent for an empty registry, reports failure) and
verified live: with one override present the control was active, resetting cleared the row, returned
the marker to `Default from config` and left the control disabled.

## Drift

No drift from the approved design. Four points were amended during review and the spec was updated
to match: the `pattern` constraint (closing FR-1b), the admin read path bypassing the cache, the
shared guard on the declarations endpoint, and the sanitisation ordering.
