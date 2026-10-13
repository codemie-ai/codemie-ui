# Technical Research

**Task**: skill bundle upload editor companion-files warning
**Generated**: 2026-10-06
**Research path**: filesystem (codegraph MCP not available in this environment)

---

## 1. Original Context

EPMCDME-15558 — "Scripts shipped in skills are available in the workspace" (part of epic EPMCDME-15364, "Programmatic Tool Composition"). The codemie-ui-scoped sub-task is: "Show the bundle upload warning" in the skill editor. Specifically:

When a user uploads a skill bundle (companion files/folders) in the skill editor, the backend seeding mechanism (being built separately in the `codemie` repo, out of scope here) enforces ceilings when forking skill files into a workspace: a 10 MB total size ceiling and a 100 file count ceiling per skill bundle. If a skill's bundle exceeds either ceiling, the backend will only seed a subset of files into any workspace that forks it (per architecture decisions D3, D4, D4a, D7, D24 in the epic's architecture spec). The codemie-ui task is to show a non-blocking warning in the skill editor when the currently-edited bundle exceeds these ceilings — informing the user that not all files will be copied into a workspace — while still allowing the skill to be saved regardless of ceiling status (the warning must never block saving).

---

## 2. Codebase Findings

### Existing Implementations

Skill editor / bundle component chain (all under `src/pages/skills/`):

- **`src/pages/skills/components/SkillBundleFilesSection.tsx`** — the companion-files editor UI (upload input, folder grouping, remove-file button, add-folder popup). Props: `{ companionFiles: SkillCompanionFile[]; folders: string[]; isLoading?: boolean; onCompanionFilesChange; onFoldersChange }`. Already has a local, unexported `formatFileSize(sizeBytes?: number): string` helper (B/KB/MB, 1 decimal) and a `useMemo`-grouped `groupedFiles` by folder. This is the natural location to add the warning banner — it already receives the full `companionFiles` array and already computes derived memoized values from it.
- **`src/pages/skills/utils/skillBundleUtils.ts`** — pure helpers: `normalizeBundleFolderPath`, `buildBundleFilePath`, `getBundleFolderPath`, `getBundleFileName`, `collectBundleFolders(companionFiles, folders)`, `fileToSkillCompanionFile(file, folderPath): Promise<SkillCompanionFile>` (sets `size_bytes: file.size` on upload). No aggregation function (total size / file count) exists yet — this file is the natural place to add an exported `getBundleTotals(companionFiles)` → `{ totalSizeBytes, fileCount }` helper, following the existing small-pure-function style.
- **`src/pages/skills/validation/skillValidation.ts`** — Yup schema (`createSkillValidationSchema(maxContentLength)`) covering name/description/content/project/visibility/categories/toolkits/mcp_servers/enabled_builtin_subagents. It does **not** validate `companionFiles` or `bundleFolders` — those are plain `useState` outside react-hook-form. Confirms there is no current blocking mechanism tied to bundle contents, and the new ceiling check must stay outside this schema (adding it here would gate Save).
- **`src/pages/skills/hooks/useSkillForm.tsx`** (also referenced as `.ts` by one subagent — verify extension at implementation time) — holds `companionFiles`/`bundleFolders` as local state (`setCompanionFiles`, `setBundleFolders`, `isCompanionFilesLoading`, `areCompanionFilesDirty`, `applyBundlePreview`). `onSubmit` builds `SkillCreateRequest`/`SkillUpdateRequest` and calls `skillsStore.createSkill`/`updateSkill` unconditionally — submission is never gated on bundle size/count today, and must stay that way.
- **`src/pages/skills/components/EditSkillForm.tsx`** — page wiring `useSkillForm` → `SkillForm`; Save button is unconditionally enabled.
- **`src/pages/skills/components/SkillForm.tsx`** — renders `<SkillBundleFilesSection companionFiles={companionFiles} folders={bundleFolders} isLoading={isCompanionFilesLoading} onCompanionFilesChange={...} onFoldersChange={...} />` inside a `FormSection title="Bundle Files"`. `companionFiles`/`bundleFolders` are passed straight through from `useSkillForm`.
- Other skill pages composing `SkillForm`/`useSkillForm` (likely no changes needed): `CreateSkillPopup.tsx`, `NewSkillPage.tsx`.

### Types

`src/types/entity/skill.ts`:

```ts
export type SkillCompanionFileEncoding = 'text' | 'base64'
export type SkillCompanionFileKind = 'reference' | 'asset' | 'other'

export interface SkillCompanionFileMetadata {
  path: string
  kind?: SkillCompanionFileKind | null
  mime_type?: string
  encoding?: SkillCompanionFileEncoding
  size_bytes?: number
}

export interface SkillCompanionFile extends SkillCompanionFileMetadata {
  content: string
}

export interface SkillBundlePreview {
  name: string
  description: string
  content: string
  companion_files: SkillCompanionFile[]
}
```

`Skill.companion_files?: SkillCompanionFileMetadata[]` (metadata only, lazily fetched). `SkillCreateRequest`/`SkillUpdateRequest.companion_files?: SkillCompanionFile[]` (full content on save). **`size_bytes` is optional** — any aggregation must treat missing values as 0, not crash. No bundle-level total-size or file-count field exists anywhere in the type system; both must be computed client-side (`companionFiles.length` and `companionFiles.reduce((sum, f) => sum + (f.size_bytes ?? 0), 0)`).

### Store

`src/store/skills.ts` (Valtio `skillsStore`):
- `createSkill(data: SkillCreateRequest)` → `POST v1/skills`
- `updateSkill(id, data: SkillUpdateRequest)` → `PUT v1/skills/${id}`
- `importSkillBundlePreview(file: File)` → `POST v1/skills/import-bundle-preview` (multipart)
- `getSkillCompanionFiles(id)` → `GET v1/skills/${id}/companion-files`
- `getSkillCompanionFileContent(id, path)` → `GET v1/skills/${id}/companion-files/content?path=...`
- `getSkillConfig()` → `GET v1/skills/config`, returns `SkillConfig { max_content_length, min_content_length }`, cached in `skillsStore.skillConfig`. **No bundle size/file-count limits are returned from backend config today.** Unless `SkillConfig` is extended server-side, the 10MB/100-file ceilings must be hardcoded client-side constants (ticket does not indicate a backend config endpoint for these — ceilings are described as backend-enforced during seeding, not necessarily exposed via `/v1/skills/config`).

None of the store actions perform size/count validation; save is always unconditional.

### Architecture and Layers Affected

- **Component layer** — `SkillBundleFilesSection.tsx` (primary edit), `SkillForm.tsx` (wrapper, no change expected beyond prop pass-through if totals are lifted up).
- **Utility layer** — `skillBundleUtils.ts` (new pure aggregation helper).
- **Constants layer** — `src/constants/skills.ts` (new ceiling constants).
- No store, API, or validation-schema layer changes expected — this is a presentational, derived-state-only feature.

### Integration Points

- `fileToSkillCompanionFile` is the only place `size_bytes` is populated from a browser `File` object (`file.size`), confirming per-file size is already available at upload time for freshly-added files. For files loaded from the backend (`getSkillCompanionFiles`), the metadata already includes `size_bytes` from the server. No new API calls are needed — the warning is a pure function of in-memory `companionFiles` state.

### Patterns and Conventions

- **Non-blocking warning component**: `src/components/InfoWarning/InfoWarning.tsx` (barrel export `src/components/InfoWarning/index.ts`, imported as `import InfoWarning from '@/components/InfoWarning'`). This is the established, documented (`.ai-run/guides/components/reusable-components.md`) reusable primitive for exactly this purpose — explicitly listed as the replacement for a hand-rolled bordered `<div>` warning.

  ```tsx
  interface InfoWarningProps {
    type?: InfoWarningType   // WARNING | INFO | ERROR, from '@/constants', default WARNING
    header?: string
    message: string
    className?: string
  }
  ```
  Styling via `cn()`: `WARNING` → `bg-aborted-primary/20 border-aborted-primary`; base wrapper `flex p-2 rounded-md border text-xs` with an info icon. Purely presentational — never wired into react-hook-form `formState.errors`, so it never blocks submit.

- **Concrete non-blocking precedent** (same shape as this task — compute derived boolean, render conditionally, leave Save enabled):
  - `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPToolkit.tsx` — `unavailableIds = useMemo(...)`, then `unavailableIds.length > 0 ? <InfoWarning type={InfoWarningType.WARNING} message="..."/> : null`, rendered unconditionally alongside the rest of the form with no effect on submit.
  - `src/pages/dataSources/components/DataSourceForm/DataSourceForm.tsx:304` — simplest usage, default type, single message string.
  - Other call sites following the same pattern: `LLMSelector.tsx`, `PluginToolkit.tsx`, `ChatPremiumModelTip.tsx`, `WorkflowDetailsHeader.tsx`, `SettingsForm.tsx`.

- **Existing toast pattern is NOT the right precedent** — `SkillBundleFilesSection.tsx` currently uses `toaster.error(...)` for actual upload errors (blocking-style, transient). Per `.ai-run/guides/development/error-handling-patterns.md`, toasts are store-triggered and transient; this warning must be a persistent, recomputed-on-change inline banner (`InfoWarning`), not a toast.

- **Constants convention**: `src/constants/skills.ts` already holds `MAX_SKILL_CATEGORIES`, `MAX_CONTENT_LENGTH`, etc. New constants `MAX_SKILL_BUNDLE_SIZE_BYTES = 10 * 1024 * 1024` and `MAX_SKILL_BUNDLE_FILE_COUNT = 100` fit this file. An unrelated, differently-scoped example of the naming convention exists in `src/components/form/FilesDropzone/constants.ts` (`MAX_FILES = 10`, `MAX_FILE_SIZE_MB = 100`) — different magnitudes, not reusable, but confirms project naming style (`MAX_X`, `MAX_X_BYTES` derived from an MB constant).

- **Form-patterns guide explicit stance**: `.ai-run/guides/patterns/form-patterns.md` states field invariants that must block Save belong in the Yup schema; "component-local state (blocked flags, inline guards) is UX feedback only." This confirms the correct, guide-sanctioned place for a non-blocking check is component-local derived state, not the schema.

- **Size formatting is duplicated, not shared**: `formatFileSize` exists locally and unexported in `SkillBundleFilesSection.tsx` (B/KB/MB). A second, unrelated local `formatFileSize` exists in `src/pages/chat/components/ChatHeader/AgentWorkspaceBrowserPopup.tsx` (bytes only, no KB/MB). No shared `src/utils/formatBytes.ts` utility exists. Implementation should either export the existing skills formatter from `SkillBundleFilesSection.tsx` or move it into `skillBundleUtils.ts` for reuse in both the per-file display and the new total-size message — do not introduce a third duplicate.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/form-patterns.md` — validation-blocking vs UX-feedback distinction (see above); binding for this task.
- `.ai-run/guides/patterns/state-management.md` — standard Component → Store → API layering; a bundle-size/file-count warning is a pure client-side derived computation (`useMemo`), not a store round-trip, since it only summarizes already-held in-memory data.
- `.ai-run/guides/components/component-patterns.md` — general component conventions (container/presentation split, `cn()`, 300-line soft limit); no explicit warning-specific guidance beyond this.
- `.ai-run/guides/development/error-handling-patterns.md` — explicitly documents `InfoWarning` as the component for persistent/inline info-or-warning banners, distinct from transient store-triggered toasts (`toaster.error/success/info`).
- `.ai-run/guides/components/reusable-components.md` — lists `InfoWarning` (`@/components/InfoWarning`, props `message`, `type?: InfoWarningType`, `header?`) under the convention table: "Custom div with border → `InfoWarning` with `InfoWarningType` enum." This is a direct instruction to use this component rather than hand-roll a banner.

### Architectural Decisions

No files in this repo reference `EPMCDME-15364`, `EPMCDME-15558`, "Programmatic Tool Composition", or architecture decisions D3/D4/D4a/D7/D24 — that spec lives in the `codemie` (backend) repo and is out of scope here, consistent with the ticket's framing. No ADRs or docs in `docs/`/`.ai-run/` cover this feature. The target run directory (`docs/superpowers/tasks/2026-10-06-skill-bundle-ceiling-warning/`) existed but was empty prior to this analysis.

### Derived Conventions

| Concern | Mechanism | Where |
|---|---|---|
| Blocking validation (gates Save) | Yup schema (`skillValidation.ts`), surfaced via RHF `errors.<field>` | schema file |
| Non-blocking advisory tied to live form data | Local derived state (`useMemo`), rendered via `<InfoWarning type={InfoWarningType.WARNING}>` | inside the component (not store, not schema) |
| Transient one-off notification | `toaster.error/info`, called from store only | store layer |

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/skills/components/__tests__/SkillBundleFilesSection.test.tsx` — only 2 tests, both about the remove-button accessible name/icon; no upload, size, or count tests.
- `src/pages/skills/utils/__tests__/skillBundleUtils.test.ts` — only tests `normalizeBundleFolderPath`; `fileToSkillCompanionFile`, `collectBundleFolders`, `buildBundleFilePath` are untested.
- `src/pages/skills/hooks/__tests__/useSkillForm.test.tsx` — only verifies `getSkillConfig` call and `max_content_length` propagation; nothing about companion files.
- `src/pages/skills/validation/__tests__/skillValidation.test.ts` — only covers `content` length.
- `src/pages/skills/components/__tests__/EditSkillForm.test.tsx` — shallow smoke test, `useSkillForm` fully mocked.

### Testing Framework and Patterns

- Vitest + React Testing Library, two Vitest projects (`unit`, `integration`) per `vite.config.ts`. Bundle tests so far are all `unit`-style, co-located under `__tests__/` siblings (`components/__tests__/`, `utils/__tests__/`, `hooks/__tests__/`, `validation/__tests__/`), named `<SourceFile>.test.ts(x)`.
- Reusable boundary-test pattern for a 10MB file-size check: `src/pages/settings/administration/projectsManagement/__tests__/ImportUsersModal.test.tsx` (~lines 232–252) — constructs a `File`/Blob of a given byte length via a `createCsvFile(name, size)`-style helper, fires `user.upload(input, file)`, asserts behavior at/over the boundary ("exceeding 10MB" / "exactly at the 10MB limit").
- Reusable file-count-limit pattern: `src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx` and `src/hooks/__tests__/useFileUpload.test.tsx` (`maxFiles` testing).
- No MSW; API/store boundaries mocked via `vi.mock`.

### Coverage Gaps

- No tests exist anywhere for file-count or total-bundle-size validation/warnings in the skill editor (confirmed via grep for `MAX_BUNDLE`, "100 files", "10MB" in `src/pages/skills` — no matches).
- No `Skill`/`SkillCompanionFile` object test-factory exists; existing tests use ad hoc literals or `{} as Skill` casts. New tests will need to build minimal objects inline per the type shape (`path`, `size_bytes`, `content`, `encoding`, `mime_type`).

---

## 5. Configuration and Environment

### Environment Variables

None found specific to skill bundle size/count ceilings. No `import.meta.env.VITE_*` or `window._env_` reference to bundle limits exists.

### Configuration Files

- `src/constants/skills.ts` — existing skill-domain numeric constants (`MAX_SKILL_CATEGORIES`, `MAX_CONTENT_LENGTH`, etc.); new ceiling constants belong here.
- `SkillConfig` type/`v1/skills/config` endpoint (`src/store/skills.ts`) currently only returns content-length bounds — not a source for bundle ceilings today. If the backend later exposes these ceilings dynamically, this is the extension point, but nothing in the current ticket or codebase indicates that endpoint will carry them; treat as hardcoded client constants for this task.

### Feature Flags and Deployment Concerns

None identified. This is a pure UI/presentational change with no deployment, flag, or secrets implications.

---

## 6. Risk Indicators

- **No backend-exposed ceiling values** — `SkillConfig` (`GET v1/skills/config`) does not currently return bundle size/count limits. The 10MB/100-file ceilings must be hardcoded as UI constants, creating a drift risk if the backend changes these values independently (backend changes live in the separate `codemie` repo, out of scope here, per architecture decisions D3/D4/D4a/D7/D24 not visible in this repo).
- **`size_bytes` is optional** on `SkillCompanionFileMetadata` — files fetched from the backend without this populated would silently undercount total size if not defaulted to 0; must be handled explicitly in the aggregation helper.
- **No existing test coverage** for any bundle size/count logic — `SkillBundleFilesSection.test.tsx`, `skillBundleUtils.test.ts`, and `useSkillForm.test.tsx` have zero related tests today; new logic needs tests written from scratch, though strong boundary-test precedents exist (`ImportUsersModal.test.tsx`, `FilesDropzone.test.tsx`).
- **Duplicated, unshared `formatFileSize` helpers** (`SkillBundleFilesSection.tsx` and unrelated `AgentWorkspaceBrowserPopup.tsx`) — risk of introducing a third divergent implementation if not consolidated.
- **Must not touch `skillValidation.ts` Yup schema** — the guide (`form-patterns.md`) and current code both confirm bundle fields are intentionally outside RHF validation; any accidental schema-level check would block Save, violating the ticket's explicit "never block saving" requirement.
- **codegraph MCP unavailable** in this environment — all findings derived via filesystem Explore agents (Glob/Grep/Read only); no call-graph or semantic cross-reference verification was possible, so file relationships were inferred from direct reads/greps rather than a dependency graph.
- Minor: one subagent referenced `useSkillForm.ts` and another `useSkillForm.tsx` — exact extension should be confirmed with a quick `Glob` at implementation time (not verified independently in this synthesis).

---

## 7. Summary for Complexity Assessment

This task touches a single architectural layer in a narrow, well-contained way: the **Component layer** (`SkillBundleFilesSection.tsx`, the companion-files editor UI, already receiving `companionFiles: SkillCompanionFile[]` as a prop) plus a small **Utility layer** addition (`skillBundleUtils.ts`, for a pure total-size/file-count aggregation function) and a **Constants layer** addition (`src/constants/skills.ts`, two new numeric ceilings). No Store, API, or Yup-validation-schema changes are required or appropriate — the ceilings are purely client-side derived state computed from data already in memory, and the guide (`form-patterns.md`) explicitly directs that non-blocking checks stay out of the validation schema. Estimated file-change surface is small: 1 component edit, 1 utility addition, 1 constants addition, plus corresponding test additions — likely 3-5 source files plus 2-3 test files.

Technical novelty is low: the codebase has an established, documented reusable component (`InfoWarning`) for exactly this non-blocking-warning UX pattern, with multiple concrete precedents (`MCPToolkit.tsx`, `DataSourceForm.tsx`) showing the "compute derived boolean via `useMemo`, render `<InfoWarning>` conditionally, leave Save untouched" shape. The implementation can closely mirror `MCPToolkit.tsx`'s pattern rather than inventing a new one.

Test coverage posture for the directly affected files is currently weak-to-nonexistent: `SkillBundleFilesSection.test.tsx` has only 2 narrow tests (unrelated to size/count), and `skillBundleUtils.test.ts` covers only one unrelated helper. However, strong boundary-test precedents exist elsewhere in the repo (`ImportUsersModal.test.tsx` for a 10MB-boundary file-size test, `FilesDropzone.test.tsx`/`useFileUpload.test.tsx` for file-count-limit tests), so new tests can be modeled closely on existing patterns rather than designed from scratch. Key risk factors for complexity scoring: the optional `size_bytes` field requiring defensive aggregation, the duplicated/unshared `formatFileSize` helper that should be consolidated rather than tripled, and the absence of any backend-exposed config for these ceilings (hardcoded constants, with a future drift risk against the separate backend repo's enforcement logic).
