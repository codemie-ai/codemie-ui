# Security

Entry point for security work in this repository. Owns the remediation order, the discovery
commands, the exit-code traps, the pin convention, and the MR handoff.

Process policy — classify, route, fix, verify, deliver — is owned by the `secops` bundle
(`secops:security-remediate` and the per-class fix skills). This file records only what is
specific to this repository.

| When | Read |
|---|---|
| A scanner or CVE ticket names this repo | this file |
| You need to move a package version | [`dependencies.md`](dependencies.md) |
| The finding is in an image, a base, or an OS package | [`images.md`](images.md) |
| You have a fix and need to prove it | [`verification.md`](verification.md) |
| You are writing code: HTML sinks, redirects, cross-window messages, config, secrets | [`../development/security-patterns.md`](../development/security-patterns.md) |
| You need the gate commands themselves | [`../quality-gates.md`](../quality-gates.md) |
| You need branch, commit, or MR mechanics | [`../standards/git-workflow.md`](../standards/git-workflow.md) |

## Discovery commands

Versions, tags, package sets and counts are not written into these guides. Run the command.

| You need | Run |
|---|---|
| The scripts this repo declares | `node -e "console.log(Object.keys(require('./package.json').scripts).join('\n'))"` |
| Every image and its Dockerfile | `git ls-files '*Dockerfile*'` |
| Every base image and its tag | `grep -nE '^FROM' $(git ls-files '*Dockerfile*')` |
| Every JS manifest | `git ls-files '*package.json' '*package-lock.json'` |
| What a package currently resolves to | `npm ls <package>` |
| What the lock file says, without an install | `node -e "const l=require('./package-lock.json');Object.entries(l.packages).filter(([p])=>p.includes('<package>')).forEach(([p,v])=>console.log(p,v.version))"` |
| Whether a package is direct or transitive | `node -e "const d=require('./package.json');console.log(d.dependencies['<package>']??d.devDependencies['<package>']??'transitive')"` |
| Which pins are load-bearing security fixes | `grep -rn "Security (EPMCDME" $(git ls-files '*Dockerfile*') package.json` |
| Which pins are marked temporary | `grep -rn "TODO: Revert\|TODO: Remove once" $(git ls-files '*Dockerfile*')` |
| Whether the repo declares its own pipeline | `ls .gitlab-ci.yml .github/workflows 2>&1` — neither exists; the pipeline is external, see [`verification.md`](verification.md) |
| What a comparable fix looked like | `git log --oneline -i --grep='CVE' -15`, then `git show <sha>` |

## Remediation order

Steps 1 and 2 decide whether the diff reaches the scanned artifact at all.

1. **Identify the image the ticket means.** A ticket says `codemie-ui`; the repository has several
   Dockerfiles and one of them ships. Mapping: [`images.md`](images.md).
2. **Locate the surface the package lives on** — the npm manifest, an `apk` line inside an image,
   or a base image tag. Table: [`dependencies.md`](dependencies.md).
3. **Match the fix location to the finding.** An OS package is fixed in the image layer; an npm
   package is fixed in `package.json` / `package-lock.json`, not as an image-level override, which
   would leave the lock file vulnerable for every other consumer.
4. **Apply the minimal change** with a `# Security (EPMCDME-…)` comment naming the ticket, the CVEs
   and a one-line reason.
5. **Run what the change requires** — table below.
6. **Commit and open the MR**, carrying the `npm run test-harness` log — § MR handoff.

## Verification after a fix

Scope verification to what changed. Command details and skip policy:
[`../quality-gates.md`](../quality-gates.md).

Run `npm ci` first. A stale install makes the gates below report green while most suites never
execute — [`verification.md`](verification.md) § 1.

| What you changed | Run | Why |
|---|---|---|
| `package.json` / `package-lock.json` | `npm ci`, then `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:integration` | `npm ci` proves the lock is installable and self-consistent; `npm install` would rewrite it |
| `src/` as part of the fix | The same four gates, plus a test covering the changed path | Application-level fixes in history shipped with tests — `git log --oneline -i --grep='CVE'` |
| A `Dockerfile` only | Rebuild and rescan — [`images.md`](images.md) | No gate in this repository looks inside an image |
| `nginx.conf` | Rebuild and rescan, and exercise the served app | Nothing in the working tree validates this file |
| Anything at all | `npm run test-harness`, log into the MR | § MR handoff |

## MR handoff

Two things must reach the MR description, and neither happens by itself.

### Regression run

The review pipeline lints the Dockerfiles, builds the images, scans for secrets and runs Sonar. It
does not deploy, and it does not scan an image for CVEs.

The regression suite runs when a human posts `/sanity` on the MR. That triggers the Sanity Build
Pipeline: it creates the codebase branch and CD pipeline, builds, deploys the branch, and runs the
test suite against it.

The MR description must ask a reviewer to post `/sanity`, because an automation cannot post it for
itself:

```markdown
## Verification needed
Local gates passed (see above). Please post `/sanity` on this MR to trigger the Sanity Build
Pipeline — the review pipeline does not deploy, so this is the only regression run.
```

Post `/sanity` again after a push.

### Test-harness log

```bash
npm run test-harness   # uvx codemie-test-harness --sanity-ui
```

Paste the console log into the MR description. It runs against a deployed environment, not the
working tree: for a Dockerfile-only or dependency-only fix it shows the environment still works,
not that the diff is exercised. State which of the two is being claimed.

The compliance bot checks section 4 for this log and is suppressible with the
`skip-compliance-check` label, so the log is the only regression evidence that reliably exists —
[`verification.md`](verification.md) § 4.

Do not close a security MR with `/code-reviewer`'s auto-approve mode —
[`verification.md`](verification.md) § 6.

## Exit codes that mislead

Observed in this repository. Read the output, not the exit code.

| Command | What happens |
|---|---|
| `npm run secrets:check` | Runs gitleaks in a container pulled at run time. Without registry access it exits non-zero and still prints `Secrets detected! …` — the exit handler cannot tell a pull failure from a finding. Read the lines above that message. |
| `npm run secrets:check` | Scans the working directory only (`gitleaks dir`), never git history. A credential committed and since deleted from the tree passes. |
| `npm run typecheck` | `TS2307: Cannot find module '<pkg>'` for a package present in both `package.json` and `package-lock.json` means `node_modules` is stale. Run `npm ci` and re-check. |
| `npm run test:unit` / `test:integration` | `Tests: N passed` counts only suites that imported successfully; a suite that failed to import adds nothing to it. Read the `Test Files` line — [`verification.md`](verification.md) § 1. |
| `npm run sonar-local` | Exits 0 with `Skipping Sonar scan because SONAR_TOKEN is not set`, and again when the server is unreachable. It sits in the Husky pre-commit hook, so a commit can pass its Sonar gate having analysed nothing. The enforcing Sonar gate runs in the MR pipeline. |

A gate that could not run is unverified, not passed. Registry failure, stale scanner database,
unreachable Sonar — report it and stop.

## Security pin comments

The `# Security (<TICKET-ID>)` marker and its per-ecosystem shape are owned by
`secops:container-cve-fix` (Pattern 6) — including the `_comments` key that carries it for a
`package.json` `overrides` entry, since JSON admits no comment. The local precedent for the
Dockerfile form, with its paired `# TODO: Revert` line, is `git show 26a5a30d2`.

Such a pin is load-bearing. Do not relax or remove it as cleanup; when the base image catches up,
remove it in its own commit.

## Secrets

Rotation-first handling — a committed credential is compromised and is rotated by a human, and a
secret finding is never auto-closed — is owned by `secops:secret-fix`. Two repository-specific
points:

- The local secret gate does not read git history (traps table above), so a clean tree says nothing
  about what is already committed.
- `.gitleaks.toml` carries a path allowlist. Adding a path suppresses scanning for everyone; it
  needs a reason in the commit message.
