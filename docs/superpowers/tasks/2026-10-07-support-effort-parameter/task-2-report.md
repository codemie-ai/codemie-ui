DONE

Commit: 6492363
Files changed: src/constants/validation.ts, src/pages/assistants/utils/__tests__/effortConstraints.test.ts, src/pages/assistants/utils/effortConstraints.ts
Test command: npx vitest run --project unit src/pages/assistants/utils/__tests__/effortConstraints.test.ts
Test result: EXIT=0, 15/15 tests passed (getEffortLevels, buildEffortRule, isWarningEffortLevel all covered)
Notes: Followed RED->GREEN TDD flow (confirmed import-failure RED before implementation). Added `EFFORT_WARNING_LEVELS: ['xhigh', 'max']` to VALIDATION_CONSTRAINTS and `EFFORT_INVALID` message to VALIDATION_MESSAGES in src/constants/validation.ts. Implemented effortConstraints.ts verbatim per the plan's reference implementation, with the `oneOf([...levels, undefined] as (string | undefined)[], ...)` type annotation to satisfy Yup's typing (no behavior change). Full `tsc --noEmit -p tsconfig.json` passed with EXIT=0 after implementation. Pre-commit hook (prettier/eslint/tsc/license-headers/secrets/sonar-local) ran clean; prettier wrapped the `oneOf(...)` call onto multiple lines. Commit contains exactly the three owned files (verified via `git show --stat HEAD`).
