# Dependency surfaces and version moves

Index: [`README.md`](README.md). Owns which surface a flagged package lives on and the command that
moves each one.

Lock-file discipline — minimal manifest edit, targeted relock, never a wholesale regeneration — is
owned by `secops:container-cve-fix`. Below is how that applies to this repository.

## Which surface

Match on where the package is *installed*, not on its name.

| The package is installed | Surface | Pin style |
|---|---|---|
| Into the app, named in `package.json` | `dependencies` / `devDependencies` | Range (caret) |
| Into the app, only as someone else's dependency | `overrides` in `package.json` | Range or exact |
| By `apk` inside an image that ships | the relevant `Dockerfile` | Exact `=version` — [`images.md`](images.md) |
| By `apk` inside a build stage only | `multistage.kc-theme.Dockerfile` | Not shipped — § Build-stage findings |
| By the base image itself | the `FROM` line | Tag bump — [`images.md`](images.md) |

Confirm the manifest set rather than assuming it:

```bash
git ls-files '*package.json' '*package-lock.json'
```

`mock-server/` and `scripts/` carry no manifests of their own; everything resolves through the root
pair. Both multistage Dockerfiles install with `npm ci`, so the lock file is what ships — a
`package.json` edit that does not reach the lock changes nothing in the built image.

## Direct dependency

```bash
npm install --package-lock-only <package>@<fixed-version>   # manifest + lock, no install
npm ci                                                      # install exactly what the lock says
npm ls <package>                                            # confirm what was resolved
```

`--package-lock-only` updates the manifest and the lock and touches nothing else. Follow it with
`npm ci`, not `npm install`: `npm ci` installs the lock verbatim and fails when the two disagree,
which is the check wanted after editing them.

Commit `package.json` and `package-lock.json` together, or the repository has a state where
`npm ci` fails for everyone.

Never hand-edit `package-lock.json`. A package absent from `package.json` is transitive, and the fix
is the `overrides` entry below.

## Transitive dependency — `overrides`

A transitive package has no manifest line to bump. An `overrides` entry forces the resolver at every
nesting site:

```jsonc
"overrides": {
  "<package>": "<fixed-version>"
}
```

```bash
npm install --package-lock-only    # re-resolves under the new override
npm ci
node -e "const l=require('./package-lock.json');Object.entries(l.packages).filter(([p])=>p.includes('<package>')).forEach(([p,v])=>console.log(p,v.version))"
```

The last command is the verification step. npm leaves a nested copy behind when the override does
not apply, and an override that changed nothing produces a zero-line lock diff — a fix that did not
happen looks like a clean run.

JSON admits no comment, so the mandatory `Security (<TICKET-ID>)` note travels in a `_comments` key
beside `overrides` and in the commit message body. Shape and wording:
`secops:container-cve-fix` (Pattern 6). There is no `_comments` block in `package.json` yet — the
first override adds one.

## OS packages inside the images

An OS-level finding — zlib, openssl, busybox, anything from the Alpine base — has no npm surface. It
is fixed in a `Dockerfile`, and which one depends on the image the ticket names:
[`images.md`](images.md).

## Build-stage findings

`multistage.kc-theme.Dockerfile` installs `openjdk17` and `maven` with `apk` in its build stage.
Those do not reach the shipped artifact — that image's final stage is `busybox` carrying the built
jar. Confirm which stage the scanner looked at before editing.

## Licences

```bash
npm run license-check    # npx license-checker --onlyAllow '<allowlist>'
```

The allowlist is inline in that script in `package.json`. A dependency whose licence falls outside
it is not admissible, whatever its version.

Adding a brand-new dependency is not a bump: it needs review on licence, maintenance and transitive
footprint. Prefer an `overrides` pin on what is already there.

## Traps

- `npm audit fix --force` re-resolves broadly and will downgrade or major-bump direct dependencies
  to satisfy an advisory. npm prints it as a suggestion after most installs; it is not a remediation.
- `npm install` without `--package-lock-only` also runs `prepare`, which is `husky` here. That works
  inside the repository and fails outside it; add `--ignore-scripts` when resolving in a scratch copy.
- `npm run typecheck` reporting `TS2307: Cannot find module` for a package present in both the
  manifest and the lock means the install is behind. Run `npm ci`, then re-check.
