# Spec — EPMCDME-15558: Skill bundle upload ceiling warning

## Context

Part of epic EPMCDME-15364 ("Programmatic Tool Composition"). The backend (separate `codemie`
repo, out of scope here) enforces ceilings when forking a skill's bundle files into a conversation
workspace: a 10 MB total size ceiling and a 100 file count ceiling (architecture decisions D3, D4,
D4a, D7, D24). If a skill's bundle exceeds either ceiling, only a subset of its files will be
seeded into any workspace that forks it.

The codemie-ui task: show a non-blocking warning in the skill editor's bundle files section when
the currently-edited bundle exceeds either ceiling, so the author understands not all files will
be copied into a workspace. The warning must never block saving the skill.

## Requirements

1. Compute, from the in-memory `companionFiles: SkillCompanionFile[]` already held by the skill
   editor, the bundle's total size in bytes and total file count.
2. Treat a missing/undefined `size_bytes` on any file as `0` for the size total (per
   `SkillCompanionFileMetadata.size_bytes` being optional).
3. If total size > 10 MB (`10 * 1024 * 1024` bytes) OR file count > 100, render a non-blocking
   warning banner in `SkillBundleFilesSection.tsx`, above the folder/file list.
4. The warning uses the existing `InfoWarning` component (`type: InfoWarningType.WARNING`) — no
   hand-rolled bordered `<div>`.
5. The warning message is specific: it names which ceiling(s) are exceeded and the current values,
   e.g. `"This bundle has 134 files (limit 100) and is 12.4 MB (limit 10 MB). Only files up to
   these limits will be copied into a new workspace."` When only one ceiling is exceeded, the
   message mentions only that one (omit the other clause).
6. The warning recomputes reactively as files are added/removed (derived state, not stored).
7. Saving the skill (`createSkill`/`updateSkill` via `useSkillForm`) is never gated on this check.
   No changes to `skillValidation.ts` (Yup schema) or to `useSkillForm`'s submit logic.
8. No new API calls, no store changes. The ceilings are hardcoded client-side constants (no
   backend-exposed config for them exists today).

## Design

### New/changed files

- **`src/constants/skills.ts`** — add:
  ```ts
  export const MAX_SKILL_BUNDLE_SIZE_BYTES = 10 * 1024 * 1024
  export const MAX_SKILL_BUNDLE_FILE_COUNT = 100
  ```
- **`src/pages/skills/utils/skillBundleUtils.ts`** — add:
  - `getBundleTotals(companionFiles: SkillCompanionFile[]): { totalSizeBytes: number; fileCount: number }`
    — pure aggregation, defaults missing `size_bytes` to 0.
  - Move the existing unexported `formatFileSize` helper here from
    `SkillBundleFilesSection.tsx` and export it, so both the per-file display and the new
    total-size warning message share one implementation. No behavior change to its B/KB/MB
    formatting.
- **`src/pages/skills/components/SkillBundleFilesSection.tsx`**:
  - Import `getBundleTotals` and the moved `formatFileSize` from `skillBundleUtils.ts`.
  - Add `const bundleTotals = useMemo(() => getBundleTotals(companionFiles), [companionFiles])`.
  - Add a derived `exceedsCeilings` boolean and a message-builder that composes the specific
    wording per requirement 5.
  - Render `<InfoWarning type={InfoWarningType.WARNING} message={...} />` conditionally, placed
    above the `groupedFiles` list, following the exact pattern used in
    `MCPToolkit.tsx` (`unavailableIds.length > 0 ? <InfoWarning .../> : null`).

### Out of scope

- Any backend/`codemie` repo change (seeding, ledger, ceilings enforcement).
- Any change to `SkillConfig`/`v1/skills/config` to expose ceilings dynamically.
- Any change to `skillValidation.ts` or to `useSkillForm` submit/save gating.

### Testing

- `skillBundleUtils.test.ts`: new tests for `getBundleTotals` — empty array, files under both
  ceilings, files exceeding size only, exceeding count only, exceeding both, and a file with
  `size_bytes` undefined contributing 0 to the total.
- `SkillBundleFilesSection.test.tsx`: new tests asserting the warning is absent when under both
  ceilings, present with the size-specific message when size is exceeded, present with the
  count-specific message when count is exceeded, present with the combined message when both are
  exceeded — modeled on the boundary-test style in `ImportUsersModal.test.tsx` and
  `FilesDropzone.test.tsx`.
- No test changes needed for `useSkillForm.test.tsx`, `EditSkillForm.test.tsx`, or
  `skillValidation.test.ts` — none of their contracts change.

## Risks (carried from technical-analysis.md)

- `size_bytes` optional — handled by requirement 2 / aggregation default.
- Hardcoded ceilings may drift from backend if the backend repo's values change — accepted; no
  config endpoint exists today to source them dynamically.
