# EPMCDME-16055: Models Table Row Inconsistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every row in `ModelConfigurationTable` the same height, regardless of capability-tag count or label length, by forcing every cell onto exactly one line (truncate, don't wrap) instead of relying on a height floor.

**Architecture:** Single-file, layout-only Tailwind change in `ModelConfigurationTable.tsx`. No data-shape or logic change. The fix removes every wrap path (Model cell `break-words`, Capabilities `flex-col`/`flex-wrap`, Provider missing `overflow-hidden`) and replaces them with truncation, so the existing `h-12` row height becomes a true fixed height instead of a floor that can still grow.

**Tech Stack:** React 18, TypeScript, Tailwind CSS (`table-fixed` layout with `colgroup` percentage widths).

**Spec:** `docs/superpowers/tasks/2026-10-21-16055-models-table-inconsistent/spec.md`
(supporting: `technical-analysis.md`, `complexity-assessment.json` in the same directory)

## Global Constraints

- No change to `ModelOption`, `getCapabilities`, `getProviderLabel`, or any other data/logic — layout only (spec "Out of scope").
- No cell may wrap, at any viewport width, regardless of tag count or label length — this is the single invariant that makes `h-12` an exact height rather than a floor (spec "Decision").
- Both render call sites must stay correct: `ProjectModelsSection.tsx:292` (full page width) and `ProjectMemberModelOverrideModal.tsx:302` (narrower `Popup`, `isFullWidth`) (spec "Verification").
- `colgroup` percentages may only be adjusted if the Capabilities column genuinely cannot fit two nowrap pills side by side at the narrowest supported layout — not speculatively (spec item 5).
- No automated test is required by the ticket; do not add one unless asked (ticket/spec "Out of scope", and AGENTS.md routing: only write tests when explicitly requested).

## Review Focus

- A model with **zero** capability tags still renders the same row height as one with two tags (the `—` placeholder span must not collapse the row shorter).
- A very long **model label** with `isPremium: true` — the "Premium" `StatusBadge` must stay fully visible and inline, not get clipped or pushed off by the truncating label span.
- The **narrow popup** call site (`ProjectMemberModelOverrideModal.tsx`) — behavior that only reproduces at reduced width (Capabilities wrap, Provider overflow) must be checked there, not just on the full-width page.
- A provider value that **doesn't exist in `getProviderLabel`'s special case** (i.e. the generic `formatValue` path) with a long underscore-separated name — confirm truncation (not just the `azure_openai` example) still clips correctly.
- The **empty-state row** (`filteredModels.length === 0`, `colSpan={5}`) — confirm it isn't affected by/doesn't fight with the new `h-12`/truncation classes on populated rows (it has no `h-12`, so it naturally won't match row height, which is fine — it's a single full-width message row, not a data row the AC's "all rows same size" applies to).

---

### Task 1: Fix row layout so every cell is single-line and row height is uniform

**Test-first:** no — layout-only CSS change with no new testable function boundary; the spec's "Out of scope" note and the ticket not requesting tests mean this is checked by rendering the component in the browser while writing the change (Step 5 below), not by an automated test. Full functional verification against the ACs at both call sites happens later in the pipeline (feature-verification), not as a plan task.

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/components/ModelConfigurationTable.tsx:176-227`

**Interfaces:**
- Consumes: existing props/helpers already in the file — `ModelOption`, `getCapabilities(model)`, `getProviderLabel(model.provider)`, `formatModelCost(model.cost)`, `cn` from `@/utils/utils`. No signature changes.
- Produces: no new exports; `ModelConfigurationTable` default export keeps its current prop shape (`ModelConfigurationTableProps`), consumed unchanged by `ProjectModelsSection.tsx` and `ProjectMemberModelOverrideModal.tsx`.

- [ ] **Step 1: Fix the `<tr>` className — confirm `h-12` is present (it already is on this branch's current working tree)**

Current state at line ~178:
```tsx
<tr
  key={model.value}
  className={cn(model.isPremium && 'bg-yellow-500/5', 'text-sm h-12')}
>
```
Leave this line as-is. `h-12` only becomes a true fixed height once every cell below is guaranteed single-line — that's what the remaining steps do. Do not add any other height utility here.

- [ ] **Step 2: Fix the Model cell — truncate instead of wrap, keep the Premium badge on the same line**

Replace:
```tsx
<td className="break-words px-4 py-3 font-medium text-text-primary">
  <span>{model.label}</span>
  {model.isPremium && (
    <span className="ml-2 inline-flex">
      <StatusBadge status={StatusEnum.Warning} text="Premium" />
    </span>
  )}
</td>
```
With:
```tsx
<td className="px-4 py-3 font-medium text-text-primary">
  <div className="flex min-w-0 items-center">
    <span className="flex-1 truncate">{model.label}</span>
    {model.isPremium && (
      <span className="ml-2 inline-flex shrink-0">
        <StatusBadge status={StatusEnum.Warning} text="Premium" />
      </span>
    )}
  </div>
</td>
```
Why: `break-words` is a wrap path (a long `model.label` can wrap to 2+ lines, growing the row past `h-12`). The wrapping `div` with `min-w-0` lets the flex child shrink below its content size (required for `truncate`/`overflow-hidden` to actually clip inside a flex layout); `flex-1 truncate` on the label span makes it the one element that shrinks and ellipsizes; `shrink-0` on the badge wrapper keeps "Premium" from being compressed or pushed out.

- [ ] **Step 3: Fix the Provider cell — clip instead of overflow**

Replace:
```tsx
<td className="px-4 py-3 text-text-quaternary">
  {getProviderLabel(model.provider)}
</td>
```
With:
```tsx
<td className="overflow-hidden truncate px-4 py-3 text-text-quaternary">
  {getProviderLabel(model.provider)}
</td>
```
Why: `truncate` (Tailwind shorthand for `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`) replaces the old bare `whitespace-nowrap`, which had no `overflow-hidden` and let long labels (e.g. "Vertex Ai-anthropic Models") bleed visually into the Capabilities column — this is AC4. `truncate` already implies `whitespace-nowrap`, so no separate class is needed for that.

- [ ] **Step 4: Fix the Capabilities cell — nowrap, not wrap or column-stack**

Replace:
```tsx
<td className="px-4 py-3 align-middle">
  <div className="flex flex-wrap items-center gap-1">
```
With:
```tsx
<td className="overflow-hidden px-4 py-3 align-middle">
  <div className="flex flex-nowrap items-center gap-1">
```
(The rest of the `<td>` body — the `capabilities.map(...)` rendering and the `—` fallback span — stays unchanged.)
Why: the committed baseline used `flex flex-col` (tags stacked vertically — the original two-line-row bug). The uncommitted scratch edit on this branch changed it to `flex flex-wrap`, which still allows the two pills to wrap onto two lines at narrower widths (e.g. inside the `ProjectMemberModelOverrideModal` popup) — this is the exact AC1/AC2 symptom recurring at a different breakpoint, per the spec. `flex-nowrap` removes that path entirely: the two pills (each already has `whitespace-nowrap` on the pill `span` itself, unchanged) always sit side by side on one line. `overflow-hidden` on the `<td>` is a backstop so that if content ever exceeds the column width, it clips instead of forcing the column/table wider.

- [ ] **Step 5: Verify the Capabilities column is wide enough for two pills at the narrowest supported layout**

Run the app locally (`npm run dev`) and open a project's Models section with a model that has both `multimodal` and `tools` capabilities. Visually confirm both pills render side by side within the Capabilities column without the column growing the table past its container, at both call sites:
- `ProjectModelsSection.tsx` (full page width)
- `ProjectMemberModelOverrideModal.tsx` (inside the `Popup`, narrower)

If — and only if — the two pills cannot fit side by side in the popup's narrower rendering, widen the Capabilities column by taking a few points from Cost (currently 35%, "most slack") in the `colgroup`:
```tsx
<colgroup>
  <col className="w-[4%]" />
  <col className="w-[31%]" />
  <col className="w-[16%]" />
  <col className="w-[14%]" />
  <col className="w-[35%]" />
</colgroup>
```
Example adjustment if needed (Capabilities 14% → 18%, Cost 35% → 31%):
```tsx
<colgroup>
  <col className="w-[4%]" />
  <col className="w-[31%]" />
  <col className="w-[16%]" />
  <col className="w-[18%]" />
  <col className="w-[31%]" />
</colgroup>
```
Do not change these percentages unless the visual check above shows they're actually needed — the spec explicitly says "adjust percentages only if needed... don't change them speculatively."

- [ ] **Step 6: Commit**

```bash
git add src/pages/settings/administration/projectsManagement/components/ModelConfigurationTable.tsx
git commit -m "EPMCDME-16055: Make model table rows single-line and uniform height

Generated with AI

Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
```

---
