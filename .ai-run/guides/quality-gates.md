# Quality Gates — codemie-ui

Run gates in this order (fastest to slowest). All must pass before opening an MR.

---

### Lint

**Run**: `npm run lint`

**Pass**: No output after the file list, exit code 0.

**Fail**: Lines like `error  'foo' is defined but never used  no-unused-vars`. Exit code non-zero.

**Auto-fix**: `npm run lint:fix` — fixes auto-fixable issues (unused imports, quote style, trailing commas). Not all errors are auto-fixable; review remaining errors manually.

**Skip if**: Linting only non-`src/` files (e.g. pure config edits). Always run when touching `src/`.

---

### Type-check

**Run**: `npm run typecheck`

**Pass**: Silent output, exit code 0.

**Fail**: Lines like `src/store/assistants.ts:45:7 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.`

**Auto-fix**: None — fix TypeScript errors manually. Common causes: missing type annotations, mismatched prop types, incorrect generic parameters.

**Skip if**: Documentation-only changes (no `.ts`/`.tsx` files modified).

---

### License check

**Run**: `npm run license-check`

**Pass**: A licence summary table, exit code 0. Exits 0 on the current tree.

**Fail**: `license-checker` names the offending package and its licence. The allow list is inline in the script in `package.json` — a dependency whose licence falls outside it is not admissible, whatever its version.

**Auto-fix**: None. Either the dependency is replaced or the allow list changes, and changing the allow list is a decision, not a fix.

**Skip if**: No dependency was added, removed, or moved. This gate is not in the pre-commit hook, so it only runs when you run it.

---

### Secret detection

**Run**: `npm run secrets:check`

**Pass**: `no leaks found`, exit code 0.

**Fail**: gitleaks prints the rule and the file for each finding.

**Auto-fix**: None. A credential that reached a commit is compromised and must be rotated by a human — deleting the line is not the fix.

**Skip if**: Never skip; it also runs automatically in the pre-commit hook and server-side as the MR pipeline's `gitleaks-scan` task.

> **Read the output, not the exit code.** The script pulls the gitleaks image at run time (tag in `package.json`) and prints `Secrets detected! Please remove sensitive data before committing.` whenever the child exits non-zero — including when the image could not be pulled. It also scans the working tree only, never git history. Both traps: [`security/verification.md`](security/verification.md).

---

### Unit Tests

**Run**: `npm run test:unit`

**Pass**: All test suites pass, summary shows `X passed`, exit code 0.

**Fail**: `FAIL src/components/Foo/__tests__/Foo.test.tsx` with assertion errors or unresolved mocks.

**Auto-fix**: None — fix the test or the component code. Run a single file with `npm run test:unit -- --reporter=verbose src/path/to/Foo.test.tsx`.

**Skip if**: Changes are limited to files with no corresponding unit tests (e.g. pure config, assets). When in doubt, run anyway.

---

### Integration Tests

**Run**: `npm run test:integration`

**Pass**: All integration suites pass, summary shows `X passed`, exit code 0.

**Fail**: Suite error with component render or store interaction failure.

**Auto-fix**: None — integration tests verify Component → Store → API flow. Fix the implementation or the test assertion.

**Skip if**: Changes are purely in standalone utility functions with no component or store involvement. When in doubt, run anyway.

---

## Pre-commit Gate (Automatic)

The Husky pre-commit hook runs these automatically on every `git commit`:

| Gate | Command | Notes |
|---|---|---|
| Staged file lint/format | `npx lint-staged` | Formats and lints only staged files |
| License headers | `npm run license-headers:check` | Checks all source files for license header |
| Secret detection | `npm run secrets:check` | Scans for accidentally committed secrets |
| Sonar local scan | `npm run sonar-local` | Local SonarQube static analysis |

These run automatically — you do not invoke them manually before committing.

---

## Full Pre-MR Checklist

```bash
npm run lint          # Lint all files
npm run typecheck     # TypeScript check
npm run test:unit     # Unit tests
npm run test:integration  # Integration tests
```

All four must exit 0 before pushing and opening an MR.
