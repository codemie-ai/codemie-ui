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
