# What each gate proves

Index: [`README.md`](README.md). Owns what each gate covers and how to read its output.

## 1. `npm ci` before any gate

A stale `node_modules` surfaces as import errors. Vitest reports those as failed test *files* while
the test counter only counts suites that imported, so a broken install prints a higher passing test
count than a healthy one. `npm run typecheck` in the same state exits non-zero with
`TS2307: Cannot find module` for packages present in both `package.json` and `package-lock.json`.

Quote the `Test Files` line, not the `Tests` line. Applies to `test:unit` and `test:integration`
equally.

## 2. Local gates

| Gate | Covers | Does not cover |
|---|---|---|
| `npm run lint` | ESLint plus the `sonarjs` plugin over `src/` | Dependencies, images, `nginx.conf` |
| `npm run typecheck` | `tsc --noEmit` | Run-time behaviour |
| `npm run test:unit` / `test:integration` | Only the suites that imported | The built artifact; the API layer is stubbed |
| `npm run secrets:check` | gitleaks over the working tree | Git history; misreports a registry failure — [`README.md`](README.md) § Exit codes that mislead |
| `npm run license-check` | Resolved licences against the inline allowlist | Vulnerabilities |
| `npm run sonar-local` | Nothing without `SONAR_TOKEN` | — |

```bash
npm run sonar-local
# [sonar-local] Skipping Sonar scan because SONAR_TOKEN is not set.   → exit 0
```

`scripts/sonar/run-local-sonar.mjs` exits 0 when the token is unset and when the server is
unreachable. It runs inside the Husky pre-commit hook, so a commit can pass its Sonar gate having
analysed nothing. Export `SONAR_TOKEN` to make it real — it then runs `npm run test:coverage` plus
`sonar-scanner -Dsonar.qualitygate.wait=true` — or report that local SAST did not run.

## 3. The MR pipeline

`ls .gitlab-ci.yml .github/workflows` finds neither; the KubeRocketCI review pipeline is defined
outside the repository and posts its task table on the MR. Read that table on the MR rather than
from here.

| Task | Consequence for a fix |
|---|---|
| `gitleaks-scan` | Secret scanning happens server-side even when the local container check could not run |
| `dockerfile-lint`, `-kc-theme` | hadolint. Not installed locally and no `.hadolint.yaml` in the repo — an unpinned `apk add` fails here, not locally |
| `dockerbuild-verify`, `-kc-theme` | Both images are built, so a Dockerfile that does not build is caught |
| `sonar` | Posts new issues, security hotspots, coverage and duplication. This is the SAST gate `sonar-local` skips |

No task scans an image for CVEs. Building is not scanning — rebuild and rescan per
[`images.md`](images.md); nothing in the MR reports that step as missing.

## 4. The compliance bot

`auto_epm-cdme_vcs` posts `## COMPLIANCE REPORT` with five sections:

```
1 MR-ticket link  ·  2 Ticket health  ·  3 Code review
4 Test harness (4.1 run present · 4.2 all tests passed)  ·  5 UI evidence
```

It reads the MR description and executes nothing. The `skip-compliance-check` label suppresses it
entirely, and MRs have merged with it applied — so the harness evidence is worth producing as the
only regression signal, not because a check blocks the merge.

## 5. Comments that trigger something

| Comment | Effect |
|---|---|
| `/sanity` | Runs the Sanity Build Pipeline: builds, deploys the branch, runs the test suite against it |
| `/compliance-report` | Re-runs the compliance check and posts a fresh report |
| `/recheck` | Re-triggers the review pipeline |

`/sanity` is the only regression run against a deployed build, and only a human can post it. Every
security MR asks for it in its description — [`README.md`](README.md) § MR handoff.

## 6. Automated approval on a security MR

`README.md` § AI Code Review documents `/code-reviewer`, whose default mode pushes and approves the
MR, which compliance section 3.1 then accepts. Use `--interactive` on a security change.

## 7. Harness scope

`npm run test-harness` (`codemie-test-harness --sanity-ui`) runs against a deployed environment, not
the working tree. For a Dockerfile-only or dependency-only fix it shows the environment still works;
it does not exercise the diff. State which of the two is being claimed.

`.github/PULL_REQUEST_TEMPLATE.md` asks for `smoke-ui` screenshots while
[`../standards/git-workflow.md`](../standards/git-workflow.md) requires the `--sanity-ui` console
log. Until an owner reconciles them, satisfy both: paste the log, add a screenshot for any
user-visible change.
