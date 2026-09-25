# QA Report — EPMCDME-14649

**Branch**: `EPMCDME-14649_dynamic-banner-config` (both repositories)
**Merge base**: `origin/main`

## Gates

### Backend — `codemie`

| Gate | Command | Result |
|---|---|---|
| Lint / format | `make ruff` | pass — all checks passed |
| Build | `make build` | pass — sdist and wheel built |
| Licence headers | `make license-check` | pass — 2153 files checked, 0 missing |
| Secrets | `make gitleaks` | pass on the change; see note |
| Tests | `make test` | pass on the change; see note |
| Sanity API | `make test-harness` | 188 passed, 1 failed (LLM similarity flake), 4 skipped |

**Secrets note.** The repository-wide `make gitleaks` run is red, reporting 8 findings — all of them in untracked local `.env` backups in the working tree (`.env.bak-*`, `.env.pre-main-switch`, `local/.env.bak-*`), none of them in tracked files or in this change. A scan restricted to the branch commits is clean:

```
gitleaks git --log-opts="origin/main..HEAD"
3 commits scanned.
scanned ~9606 bytes (9.61 KB) in 173ms
no leaks found
```

**Test note.** The full suite reports 4 failures, all in enterprise/OAuth/MCP-auth tests: `test_oauth_redis_lazy_init.py`, `test_toolkit_service_auth_resolver.py`, `test_provider_adapters.py`. They fail identically on a clean `origin/main` checkout in this environment, because the `codemie_enterprise` package is not installed in the local virtualenv. They are unrelated to this change.

Collection also aborts entirely unless `MCP_AUTH_ENABLED` and `MCP_AUTH_TMS_ENABLED` are unset, for the same reason — the local `.env` enables enterprise MCP auth while the package is absent, so `main.py` raises at import time.

Counts with those two flags off:

```
4 failed, 5430 passed, 125 skipped
```

Customer-config scope specifically — the files this change touches:

```
tests/codemie/service/test_customer_config_service.py
tests/codemie/service/test_customer_config_declarations.py
tests/codemie/service/test_customer_config_validation.py
tests/codemie/service/test_customer_config_audit.py
tests/codemie/rest_api/routers/test_customer_config.py
tests/codemie/configs/test_customer_config.py
119 passed
```

### Frontend — `codemie-ui`

| Gate | Command | Result |
|---|---|---|
| Install | `npm ci` | pass |
| Type-check | `npx tsc --noEmit` | pass — no errors |
| Lint | `npm run lint` | not usable locally; see note |
| Lint (changed files) | `npx eslint <changed files>` | pass |
| Tests | `npm run test:unit` | pass — 469 files, 4977 passed, 1 skipped |

**Lint note.** The repository-wide `npm run lint` reports 9092 errors, all `import/no-unresolved` and `import/extensions` against the `@/` path alias. This reproduces on a clean `main` checkout — the local ESLint resolver config for the alias is broken — so the gate carries no signal locally and is left to CI. ESLint on the three changed files, with only those two resolver rules disabled, is clean. One real violation was found and fixed this way: a `javascript:` literal in the new link-safety test tripped `no-script-url`, which would have failed the CI lint gate.

## Verification beyond the gates

Every behavioural fix in this change was confirmed by mutation, not only by a green suite — each fix was reverted in turn and the corresponding test observed to fail:

| Reverted | Test that fails |
|---|---|
| `replace()` → `show()` | banner stacks on a config change |
| removing `clear()` | banner does not disappear when disabled |
| dismissal keyed off the current render | wrong banner suppressed after a text change |
| dropping the render-side scheme guard | all three scripting schemes render as links |
| `isEnabled` forced true | disabled banner renders |
| bypassing `apply_override` | override no longer wins over YAML |
| dropping the `enabled` filter | disabled banner reaches `/v1/config` |
| restoring the `$` anchor (before the pattern was replaced by scheme validation) | trailing-newline target accepted |

## Manual verification on the local stack

Backend restarted against the branch (`src/` and `config/` are bind-mounted, so no image rebuild is required).

- The container loads the new declaration: `DECLARATIONS = ['chatDisclaimer', 'banner']`, key `CUSTOMER_CONFIG__BANNER`, fields `enabled/message/linkLabel/linkRoute`.
- Customer config carries `banner` and none of the legacy ids.
- With `banner.enabled: true` and a message set in customer config and no override present, `GET /v1/config` returns the component with those values and the banner renders in the UI — the no-override path confirmed end to end.

## Local stack repair needed before the harness could run

The first `make test-harness` run was red — 61 failed, 29 errors — with every failure tracing to a single `400` on `POST /v1/workflows`. None of it was caused by this change.

Root cause: the local database had migrations **marked as applied whose DDL had never run**, a known consequence of switching branches. Alembic reported the database at head, so `upgrade` was a no-op. Three objects were missing:

- `workflows.pool_config`, `workflows.max_nesting_level` (`t1u2v3w4x5z7`)
- `workflow_executions.parent_execution_id`, `workflow_executions.active_sub_execution_id` and their indexes (`a7c9e1f3b5d7`)

Repair sequence: refresh `main` into the branch in both repositories (9 and 10 new commits, which advanced the revision `e13959a1b2c3` → `b1c2d3e4f5a6`); restart Colima after the container hit `OSError: [Errno 24] Too many open files: '/app/src'` (broken virtiofs); apply the missing nullable columns and indexes.

Result: 61 failed / 99 passed → **1 failed / 188 passed**. The remaining failure is `test_assistant_has_an_access_to_the_history`, an LLM similarity flake (answer "2 + 5 = 7" scored 80 against the expected "The result is 7." at a threshold of 90).

Other schema differences found during the audit were legitimate — `assistant_project_mapping`, `assistants.interactive_features` and `workflow_execution_states.preceding_state_id` are dropped or renamed by later migrations.

## Feature verification (walked through in the browser)

Local stack, backend on the branch, admin signed in.

| # | Scenario | Result |
|---|---|---|
| 1 | Administration shows one **Banner** card: a single "Show banner" switch plus message, link label and link target | pass |
| 2 | With no override and `enabled: true` in customer config, the banner renders from the YAML values | pass |
| 3 | Enabling and saving a message + link renders the banner immediately, without reloading the page | pass |
| 4 | Editing the message and saving **replaces** the banner — the previous text is gone, not stacked | pass (regression CR-001) |
| 5 | Turning the switch off and saving removes the banner without a reload | pass (regression CR-001) |
| 6 | `javascript:alert(document.cookie)` as the link target is refused — API returns 400, nothing is stored | pass |
| 7 | An external link target (`https://docs.codemie.ai/`) saves and renders, `href` intact | pass (guards the functionality the first validation draft would have removed) |
| 8 | "Reset to default" returns the card to "Default from config" and the banner disappears | pass |
| 9 | The chat disclaimer card stays "Default from config" throughout | pass (AC-9) |

After the reset, `codemie.dynamic_config` holds no `CUSTOMER_CONFIG%` rows — the stack is back to its pre-test state.

Screenshots for the merge-request description:

- `EPMCDME-14649-01-before-no-banner.png` — before, no banner
- `EPMCDME-14649-02-admin-card.png` — the single Banner card
- `EPMCDME-14649-03-after-saved.png` — after saving, banner with link
- `EPMCDME-14649-04-after-edit-no-stacking.png` — after editing the text, one banner
- `EPMCDME-14649-05-disabled-banner-gone.png` — after disabling, no banner
- `EPMCDME-14649-06-scheme-rejected.png` — scripting scheme refused
- `EPMCDME-14649-07-external-link-allowed.png` — external link works
- `EPMCDME-14649-08-reset-to-default.png` — reset back to config defaults
