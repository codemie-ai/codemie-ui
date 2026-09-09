# Plan — EPMCDME-14586 + EPMCDME-14587: OAuth integrations reuse the existing base type

## Scope (both sibling Critical bugs)

- **14587** — Jira/Confluence OAuth integrations persist under the existing `Jira`/`Confluence` types.
- **14586** — GitLab OAuth integrations persist under the existing **`Git`** type (with a "Use OAuth 2.0
  sign in" switcher, like Jira/Confluence).

OAuth becomes an **authentication method** carried by `auth_type='oauth'` in `credential_values` — no new
column. The three separate OAuth credential types **`JIRA_OAUTH` / `CONFLUENCE_OAUTH` / `GITLAB_OAUTH`
are removed entirely** from `CredentialTypes` (Python enum + Postgres enum). `GOOGLE_OAUTH` stays (a
separate feature, not in 13527's fold scope). A data-only Alembic migration rewrites existing rows.

## Target persistence

| Provider | Persisted `credential_type` | Marker |
|---|---|---|
| Jira | `Jira` | `auth_type=oauth` |
| Confluence | `Confluence` | `auth_type=oauth` |
| GitLab | `Git` | `auth_type=oauth` (+ `instance_url`) |

## Key design points

- **Provider model, not enum sentinels.** Backend resolves an OAuth setting to a provider string
  (`'jira'|'confluence'|'gitlab'`) from base type + marker, and dispatches the per-provider OAuth
  service/token-manager on that string. No code references the removed enum members.
- **GitLab shared-`Git` resolution (the hard part).** `GithubConfig` and `GitlabConfig` both map to base
  `GIT`. Only GitLab has OAuth on Git, so **`Git` + `auth_type=oauth` ⟹ GitLab OAuth**. Rules:
  - `GitlabConfig` lookup prefers a `GIT` setting with `auth_type=oauth`.
  - `GithubConfig` lookup must **exclude** `auth_type=oauth` GIT settings (never resolve a GitLab-OAuth
    setting for a GitHub call — preserves the existing anti-misroute guarantee).
- **Contract & deploy ordering.** Backend ships first (reads base type + marker, migration rewrites
  rows) before the FE stops sending `JiraOAuth`/`ConfluenceOAuth`/`GitLabOAuth`.

## Repos & branches

- **codemie** (backend) — branch `EPMCDME-14587_reuse-oauth-integration-types` (created).
- **codemie-ui** (frontend) — current branch `EPMCDME-14587_remove-new-types-fix-bugs`.

---

## Backend tasks (codemie)

### Task B1 — Provider resolution from `auth_type` marker  *(reworked; in progress)*
`SettingsService._oauth_provider(setting) -> 'jira'|'confluence'|'gitlab'|None` from base type + marker
(and legacy `*OAuth` rows during the migration window). Route `_inject_oauth_config_values` and delete
token-cleanup through it.
**Test-first: yes** — a `Jira`/`Git` setting with `auth_type=oauth` resolves as OAuth (config injection +
cleanup); PAT settings do not. (`tests/.../test_folded_oauth_type.py`.)

### Task B2 — `_lookup_setting` finds base-type OAuth rows; GitHub/GitLab disambiguation
Rewire `_lookup_setting` so Jira/Confluence/Gitlab configs prefer a base-type setting carrying
`auth_type=oauth`; `GithubConfig` excludes oauth-marked GIT settings.
**Test-first: yes** — JiraConfig/GitlabConfig resolve the folded OAuth setting; GithubConfig does not
resolve a GitLab-OAuth GIT setting.

### Task B3 — Write path: dispatch per-provider OAuth service on base type + marker
`_oauth_app_keys`, `_oauth_settings_service`, `_keep_only_oauth_app_credentials`,
`_preserve_existing_credentials` key on provider (base type + marker), not the enum members. Validate an
OAuth Jira/Confluence/Git setting carries the app-credential fields.
**Test-first: yes** — POST `credential_type='Git'` + `auth_type=oauth` persists a `Git` row and routes to
the GitLab OAuth settings service; same for Jira/Confluence.

### Task B4 — Per-provider token managers off the marker
`{jira,confluence,gitlab}_oauth/token_manager.py` stop filtering settings by the `*_OAUTH` enum; select
base type + `auth_type=oauth`.
**Test-first: yes** — token manager lists/invalidates tokens for folded rows.

### Task B5 — Remove the enum members + Alembic data migration
Data migration: rewrite `JiraOAuth`→`Jira`, `ConfluenceOAuth`→`Confluence`, `GitLabOAuth`→`Git`, adding
`auth_type=oauth` (idempotent, preserves tokens/app creds); then drop the three Postgres enum values.
Remove `JIRA_OAUTH`/`CONFLUENCE_OAUTH`/`GITLAB_OAUTH` from the Python `CredentialTypes`. Update any
remaining legacy-shaped tests to the folded shape; drop the legacy-compat branch in `_oauth_provider`.
**Test-first: partial** — migration verified by idempotency/round-trip test; enum removal guarded by the
updated suite.

---

## Frontend tasks (codemie-ui)

### Task F1 — Submit payload maps OAuth variant → base serverEnum + `auth_type='oauth'`
`jiraoauth`→`Jira`, `confluenceoauth`→`Confluence`, `gitlaboauth`→`Git`; add `auth_type='oauth'` to
`credential_values`. Locus: `getOriginalCredentialType` / payload assembly.
**Test-first: yes** — saving each OAuth variant yields the base `credential_type` + `auth_type='oauth'`.

### Task F2 — Type-filter options exclude the OAuth variants (incl. gitlab); `git` gains the toggle
`useIntegrationTypeOptions` drops `JiraOAuth/ConfluenceOAuth/GitLabOAuth`. Add `git` to
`OAUTH_VARIANT_BY_BASE_TYPE` so the Git form shows the "Use OAuth 2.0 sign in" switcher.
**Test-first: yes** — options exclude the three; `getBaseTypeForOAuthVariant('gitlaboauth')==='git'`.

### Task F3 — Read/edit hydration re-opens the OAuth toggle for all three
Editing a `Jira`/`Confluence`/`Git` setting with `auth_type=oauth` renders with the toggle ON and OAuth
fields visible.
**Test-first: yes** — edit hydration test per provider.

## Sequencing
B1→B2→B3→B4 (provider model, green throughout) → B5 (removal + migration) → F1→F2→F3. Backend ships first.

## Out of scope
`GOOGLE_OAUTH` (separate feature, stays). The unrelated `vite.config.ts` change.

## Test-infra prerequisite (done)
Removed an obsolete `sys.modules.setdefault("langgraph.pregel._retry", …)` stub from 4 OAuth-gate test
files that the env bump broke; all 4 collect and pass.
