# Deferred from code review — 2026-08-26-EPMCDME-8570 (2026-08-26)

- **Test getByRole('presentation') fragile with multiple images** — `src/pages/help/components/__tests__/HelpItem.test.tsx:93` — `getByRole('presentation')` will throw if a second `img` with `role="presentation"` is ever introduced in the same render. Pre-existing: the fragility predates this change; all tests currently pass because each render has exactly one presentation image, and no item from this diff introduces a second one.
