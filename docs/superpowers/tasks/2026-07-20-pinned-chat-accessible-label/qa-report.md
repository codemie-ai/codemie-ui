# QA Report — EPMCDME-8433

Branch: `EPMCDME-8433_add-pinned-chat-accessible-label`

| Gate | Command | Result |
|---|---|---|
| Lint | `eslint <changed files>` | ✅ pass (React-version warning only, pre-existing) |
| Typecheck | `tsc --noEmit` | ✅ pass |
| Unit tests | `vitest run --project unit ChatListItem.test.tsx` | ✅ 15/15 pass |
| Secrets | gitleaks (pre-commit) | ✅ no leaks |
| License headers | check_license_headers (pre-commit) | ✅ 0 missing |

Build not run: change is JSX-only (one `sr-only` span + one `aria-hidden` attr), no build-config or dependency impact.

## Passed: true
