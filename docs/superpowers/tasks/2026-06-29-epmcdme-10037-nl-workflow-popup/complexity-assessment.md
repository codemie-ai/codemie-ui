# Complexity Assessment: workflow creation popup natural-language generate

**Task**: Add a GenerateWorkflowPopup component with Textarea and Switch to the workflow creation page, calling POST v1/workflows/generate and navigating to the edit page on success.
**Generated**: 2026-06-29T00:00:00Z

---

## Dimension Scores

| Dimension            | Score | Label |
|----------------------|-------|-------|
| Component Scope      | 3     | M     |
| Requirements Clarity | 4     | L     |
| Technical Risk       | 2     | S     |
| File Change Estimate | 3     | M     |
| Dependencies         | 1     | XS    |
| Affected Layers      | 3     | M     |

**Total: 16/36 — M**

---

## Key Reasoning

- **Requirements Clarity (L)**: The generate endpoint response `{ name, description, yaml_config }` contains no workflow `id`, yet navigation to `/workflows/:id/edit` via `EditWorkflowPage` requires one. This is a critical unresolved gap — either the backend returns `id` undocumented, or a follow-up `POST v1/workflows` create call is needed. This design decision must be confirmed before the success path can be coded.
- **Component Scope (M)**: Four distinct touch points — new `GenerateWorkflowPopup.tsx`, modified `NewWorkflowPage.tsx` (state + conditional auto-open), new `generateWorkflow` method in `src/store/workflows.ts`, and two new interfaces in `src/types/entity/workflow.ts`. All within the workflows domain, no cross-cutting impact.
- **Red flags applied**: Requirements Clarity was already scored L (4) to reflect the `id`-in-response gap; no additional bump applied. No other red flags triggered — no auth, no schema change, no external service integration, no shared utility modifications.

---

## Routing

superpowers:brainstorming
