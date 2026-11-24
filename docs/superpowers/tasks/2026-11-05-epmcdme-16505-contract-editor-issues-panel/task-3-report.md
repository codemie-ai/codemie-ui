DONE
commit: 824566f2c
paths:
src/components/form/Input/Input.tsx
src/components/form/Input/__tests__/Input.test.tsx
src/components/form/Textarea/Textarea.tsx
src/components/form/Textarea/__tests__/Textarea.test.tsx
src/components/form/ExpandableTextarea/ExpandableTextarea.tsx
src/components/form/ExpandableTextarea/__tests__/ExpandableTextarea.test.tsx
test_command: npx vitest run --project unit src/components/form
Result: 22 files / 178 tests passed; typecheck EXIT=0. RED seen first (both warning-render tests failed; the error-wins tests passed pre-implementation as regression guards).

Ruling: amber tokens are text-aborted-primary (text) and border-aborted-secondary (border), matching ISSUE_SEVERITY.
Ruling: FieldAnnouncer left untouched (not in task files); the warning node is rendered by Input/Textarea after FieldAnnouncer, with id `<id>-warning` appended to aria-describedby. It is a plain div (no role=alert, no aria-invalid) since it is non-blocking.
Ruling: ExpandableTextarea hides the warning in the expanded popup copy, like it does for error; added a small new test file for it.
