# Plan — EPMCDME-8438: aria-label on Quill chat input

Commit per task using the repository's existing convention.

---

## Task 1 — Add `aria-label` to `quill.root` at both call sites in `Editor.tsx`

**File:** `src/components/Editor/Editor.tsx`

**Step 1 — `useEffect([placeholder])` site (lines 128–133)**

Inside the existing `if (quill && placeholder !== undefined)` block, directly after
`quill.root.setAttribute('data-placeholder', placeholder)`, add:

```typescript
quill.root.setAttribute('aria-label', placeholder)
```

The `undefined` guard is already present on this branch; no new guard needed.

**Step 2 — `onLoad` callback site (lines 181–190)**

After the existing `quill.focus()` call, add:

```typescript
if (placeholder !== undefined) {
  quill.root.setAttribute('aria-label', placeholder)
}
```

The `undefined` guard is required here: `onLoad` currently has no guard and
`setAttribute('aria-label', undefined)` would write the literal string `"undefined"`.

Both sites are necessary: `onLoad` sets the attribute at initial mount; `useEffect([placeholder])`
re-syncs it when the prop changes (e.g. switching between `DEFAULT`, `WORKFLOW`, and
`WORKFLOW_INTERRUPTED` prompt modes).

Test-first: no — the spec explicitly excludes tests for `quill.root` DOM attributes as a
Non-Goal; no existing test exercises this surface and no test file needs to change.

---

## Negative-constraint pass

Spec Non-Goals — each checked against the plan:

| Constraint | Verified by |
|---|---|
| Do not change the `placeholder` prop API or its callers | Task 1 touches only internal imperative calls inside `Editor.tsx`; prop signature and all callers are unchanged |
| Do not add `role`, `aria-placeholder`, `aria-describedby`, or any other ARIA attribute | Task 1 sets only `aria-label` |
| Do not fix accessibility of other Quill instances or page elements | Task 1 is scoped to `Editor.tsx` only |
| Do not write tests for `aria-label` on `quill.root` | Task 1 carries `Test-first: no`; no test file is created or modified |
| Do not modify `Editor.scss` or the CSS placeholder visual | Task 1 touches no `.scss` file |
