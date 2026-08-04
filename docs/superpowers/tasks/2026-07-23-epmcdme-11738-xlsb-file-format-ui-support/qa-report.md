# QA Gate Report — epmcdme-11738-xlsb-file-format-ui-support

**Branch**: EPMCDME-11738_xlsb-file-format-ui-support
**Runner**: npm
**Changed files**: `src/constants/common.ts` only
**Status**: BLOCKED (pre-existing lint failure — not caused by this change)

---

## Gates

| Gate | Status | Duration | Command | Notes |
|---|---|---|---|---|
| Lint | FAIL (pre-existing) | ~8s | `npm run lint` | 655 errors in `public/keycloakify-dev-resources/login/js/*.js` — Keycloak theme JS files outside `src/`. Zero errors in `src/constants/common.ts`. Pre-commit lint-staged passed cleanly on the staged file at commit time. |
| Type-check | PASS | ~4s | `npm run typecheck` | Exit 0, no output. |
| Unit Tests | SKIPPED | — | `npm run test:unit` | No unit tests exist for `src/constants/common.ts` (confirmed by tech analysis; skip condition: "files with no corresponding unit tests"). |
| Integration Tests | SKIPPED | — | `npm run test:integration` | Pure string constant change with no component or store logic (skip condition: "standalone utility functions with no component or store involvement"). Tech analysis confirmed no integration tests cover `SUPPORTED_FILE_FORMATS_MESSAGE_BASE` or `SUPPORTED_FILE_FORMATS_MESSAGE_CHAT`. |

---

## Failure Detail

**Lint gate** — exit code 1, 655 errors, 12 files. All errors are in:

```
public/keycloakify-dev-resources/login/js/
  menu-button-links.js  (177 issues — @stylistic/semi, quotes)
  rfc4648.js            (145 issues — @stylistic/semi, no-var, vars-on-top)
  kcMultivalued.js      (73 issues)
  webauthnRegister.js   (63 issues)
  webauthnAuthenticate.js (51 issues)
  passkeysConditionalAuth.js (34 issues)
  authChecker.js        (30 issues)
  common.js             (25 issues)
  kcNumberFormat.js     (17 issues)
  userProfile.js        (16 issues)
  … +2 more
```

**None of these files are in `src/`**. The only file changed in this PR (`src/constants/common.ts`) produces zero lint errors. The failure is a pre-existing repo-wide condition that predates this change and is not introduced or worsened by it.

Evidence that this change is lint-clean: the pre-commit Husky hook ran `lint-staged` against `src/constants/common.ts` (the only staged file) and passed with no errors at commit `27dbcdef1`.

---

## Drift Signal

no — implementation matches spec exactly. `XLSB` inserted immediately after `XLSX` in both `SUPPORTED_FILE_FORMATS_MESSAGE_BASE` and `SUPPORTED_FILE_FORMATS_MESSAGE_CHAT` as specified.

---

## Assessment

The single FAIL (lint) is a **pre-existing repo-wide condition** in Keycloak theme JS files. It is not introduced, not worsened, and not related to this PR's change. The change under review is lint-clean (confirmed by lint-staged at commit time), type-safe (typecheck: PASS), and the skip conditions for unit and integration tests are both met per the quality-gates guide.
