# Images: which one ships, how to build and scan it

Index: [`README.md`](README.md). Owns which Dockerfile is which, what each one ships, and how an
OS-level finding is pinned in it.

Rebuild-and-rescan as the verification predicate for a container CVE is owned by
`secops:container-cve-fix` and `secops:trivy-scan`. The MR pipeline builds the images and lints the
Dockerfiles; no task in it scans an image for CVEs.

## Dockerfile lint runs in CI only

`multistage.kc-theme.Dockerfile` carries `# hadolint ignore=` annotations while the repository has
no `.hadolint.yaml` and no hadolint dependency. The annotations are live: the MR pipeline runs
`dockerfile-lint` and `dockerfile-lint-kc-theme`.

Consequence for a CVE fix: an unpinned `apk add` fails DL3018 in CI, and an existing ignore covers
only the line it precedes. Pin the version added (`apk add --no-cache <pkg>=<version>`) rather than
extending the ignore.

## Which Dockerfile is which

A ticket that says `codemie-ui` means one of them. Derive the list:

```bash
git ls-files '*Dockerfile*'
grep -nE '^(FROM|USER|RUN apk|COPY)' $(git ls-files '*Dockerfile*')
```

| File | Produces | Ships |
|---|---|---|
| `Dockerfile` | The served app: a prebuilt `dist/` on nginx | Yes — the one container CVE tickets have hit |
| `multistage.Dockerfile` | The same app, built inside the image | Alternative build of the same product |
| `multistage.kc-theme.Dockerfile` | The Keycloak theme jar | Yes, as the theme artifact |
| `Dockerfile.dev` | Local dev server | No — `docker-compose.yml` only |

Evidence for row 1 is `git show 26a5a30d2`, the repository's container CVE remediation, which edits
the root `Dockerfile` and nothing else. Start there unless the ticket names the Keycloak theme.

## The root Dockerfile needs a prebuilt `dist/`

It runs no `npm`; it copies `/dist` into the nginx web root. `.dockerignore` excludes
`node_modules`, `dist_keycloak` and `.env` but not `dist`, and `dist` is gitignored, so it never
comes from a checkout.

```bash
npm ci
npm run build:prod                       # produces ./dist
docker build -f Dockerfile -t codemie-ui:cve-<TICKET> .
```

Skipping the first two commands ends the build at the `COPY /dist` line, which is the usual reason a
rebuild-and-rescan is reported as blocked.

`multistage.Dockerfile` runs `npm ci` and `npm run build:prod` itself, so it is easier to build
locally — and it pins a different nginx tag from the root file, so scanning it proves nothing about
the shipped image.

## Two nginx tags in one repository

`grep -n '^FROM' Dockerfile multistage.Dockerfile` returns two different nginx tags, and the root
one is a `-dev` variant. A `-dev` image carries a shell and a package manager, which is what makes
the `apk` pin below possible and what a scanner sees extra packages in.

Treat the divergence as a known state, not as something to tidy inside a CVE fix. When the finding
is against the base image itself, bump the tag on the Dockerfile the ticket names, and note in the
MR that the other file still carries the old tag.

## Pinning an OS package

The two mandatory comment lines are owned by `secops:container-cve-fix`. Local precedent, in Alpine
form: `git show 26a5a30d2`.

```dockerfile
# Security (EPMCDME-…): pin <pkg> >= <version> to fix CVE-…
# TODO: Revert to <base>:<tag> once the base image ships the fix
FROM <base>:<tag>-dev
RUN apk add --no-cache <pkg>=<version>
```

When the base image catches up, delete the pin in its own commit.

An `apk` pin requires a base variant that has `apk`. Switching a non-`-dev` base to `-dev` to make
room for a pin enlarges the shipped attack surface — state that in the MR rather than doing it
silently.

Both images run as a non-root user (`USER nginx`, `USER nobody`). A fix that needs write access at
run time is reversing a deliberate control.

## Scanning

Rebuild, then scan the tag just built, with the scanner that produced the finding.

Tag each verification build distinctly — `codemie-ui:cve-EPMCDME-NNNNN`, not `latest`. A stale local
tag scans clean while the fix is untested.

Verify the named CVE is absent. A shorter findings list is not proof that the named one went away.

## Failure modes

- A network or registry failure is not a clean scan. The bases are pulled at build time; a build
  that dies on registry access is unverified.
- Scanning the wrong image proves nothing. Confirm which Dockerfile the ticket names before building.
- A build-stage finding is not a shipped finding — [`dependencies.md`](dependencies.md) §
  Build-stage findings.
- `nginx.conf` ships inside the image and nothing in the working tree validates it. A change there
  is only exercised by building the image and requesting the app.
- The Keycloak theme needs a JDK. `npm run build:keycloak` runs `npx keycloakify build`, which needs
  Java; `multistage.kc-theme.Dockerfile` installs it in the build stage. Without a local JDK the
  Docker path is the only way to build that artifact, and `dockerbuild-verify-kc-theme` is what
  proves it in CI.
- The theme image's base is a different Alpine line from the others —
  `grep -n '^FROM' $(git ls-files '*Dockerfile*')`. A finding against one does not imply the other.
- A merged fix is not a deployed fix. `deploy-templates/values.yaml` leaves `image.tag` empty, so
  the chart falls back to `.Chart.AppVersion`; until that moves, the patched image is not what runs.
