# Code review — 2026-08-27-epmcdme-8534-workflow-execution-label (2026-08-27)

**request-changes** · confidence: low · 4 blocking · 0 deferred · 0 filtered as noise
Coverage: blind — n/a (compact profile) · edge-case ✓ · acceptance — n/a (no spec) · verification-gap — n/a (compact profile)  (1/4 lenses ran)

> No spec/story existed; confidence is low. CR-001 makes the accessibility fix silently absent at runtime — the label association is never written to the DOM.

## Look here first

- `src/components/Editor/Editor.tsx:137` — [other: accessibility] aria-labelledby never applied: effect runs before Quill init, static prop never re-fires, onLoad callback does not apply it — CR-001
- `src/components/Editor/Editor.tsx:137` — [other: accessibility] stale aria-labelledby persists when ariaLabelledBy prop is cleared — CR-002
- `src/pages/workflows/details/popups/WorkflowStartExecutionPopup.tsx:138` — [other: accessibility] hardcoded label ID breaks aria association if popup is ever rendered concurrently — CR-003
- `src/pages/workflows/details/popups/__tests__/WorkflowStartExecutionPopup.accessibility.test.tsx:22` — [other: test-fidelity] mock emits invalid empty-string aria-labelledby when prop is absent — CR-004

## Also flagged

(none)

## Checked and clean

commit-format na · code-quality na · security na (compact profile — standards audit intentionally omitted)
