# Technical Research

**Task**: skills bundle SkillBundleFilesSection useSkillForm SkillConfig
**Generated**: 2026-10-14
**Research path**: filesystem (codegraph MCP tool not available; research done directly with Read/Bash grep, no Explore subagents)

---

## 1. Original Context

EPMCDME-15965 (frontend, repo codemie-ui): Skill editor bundle limits and preview warning. Full requirements are in docs/superpowers/tasks/2026-10-14-epmcdme-15965-skill-bundle-limits-ui/spec.md (read it). Summary: SkillConfig in src/store/skills.ts declares wrong key bundle_seed_max_size_bytes (backend sends bundle_seed_max_file_count, bundle_seed_max_file_size_bytes, bundle_seed_max_total_size_bytes); fallback constant MAX_SKILL_BUNDLE_SIZE_BYTES in src/constants/skills.ts must become 50MB; server bundle_warning from import-bundle-preview must be added to SkillBundlePreview type, kept by applyBundlePreview in useSkillForm, and passed to SkillBundleFilesSection via NewSkillPage and CreateSkillPopup; server warning is hidden once the user edits files in the section.

---

## 2. Codebase Findings

### Existing Implementations
- `src/store/skills.ts:43-48` `SkillConfig` has `max_content_length, min_content_length, bundle_seed_max_file_count, bundle_seed_max_size_bytes` (wrong key). `importSkillBundlePreview` (~line 312) POSTs to `v1/skills/import-bundle-preview` and returns raw `response.json()`, so a `bundle_warning` is already in the payload and only the type and consumers drop it.
- `src/constants/skills.ts:46-47` `MAX_SKILL_BUNDLE_SIZE_BYTES = 10 MB` (to 50 MB), `MAX_SKILL_BUNDLE_FILE_COUNT = 100`. Add `MAX_SKILL_BUNDLE_FILE_SIZE_BYTES`.
- `src/types/entity/skill.ts:57` `SkillBundlePreview {name, description, content, companion_files}`; needs `bundle_warning?: string | null`. The `Skill` type already has `bundle_warning` (used by EditSkillForm).
- `src/pages/skills/hooks/useSkillForm.tsx` `applyBundlePreview` (line ~99) sets name/description/content, `setCompanionFilesState`, `setBundleFoldersState([])`, dirty=true. It does not keep the warning. The hook returns `{form, onSubmit, companionFiles, setCompanionFiles, bundleFolders, setBundleFolders, isCompanionFilesLoading, applyBundlePreview}`. The new state (e.g. `bundlePreviewWarning`) must be exposed and cleared.
- `src/pages/skills/components/SkillBundleFilesSection.tsx`: line 62 reads `skillConfig?.bundle_seed_max_size_bytes`. Props already include `savedBundleWarning?: string | null`. Render logic (~line 207) is `bundleCeilingWarning ?? savedBundleWarning`, so the local ceiling currently WINS, the opposite of spec requirement 5. Needs a "user edited" flag, set in `handleUploadFiles` and `handleRemoveFile` (and folder add via `updateFolders`) and reset when the incoming warning prop changes.
- `src/pages/skills/components/SkillForm.tsx` already has an optional `savedBundleWarning` prop (line 72) forwarded to the section (line 343). No new SkillForm prop is strictly needed; reuse it.
- `src/pages/skills/components/EditSkillForm.tsx:100` passes `skill.bundle_warning` as `savedBundleWarning` (the edit page; requirement 5 changes behavior there too).
- `src/pages/skills/NewSkillPage.tsx` (~lines 48-52, 83-84, 102, 166-174) and `src/components/CreateSkillPopup.tsx` (~lines 58-62, 88, 111, 145, 167-168, 185, 232-241) each destructure `useSkillForm()`, call `applyBundlePreview` for `.zip`, and for `.md` call `setCompanionFiles([]); setBundleFolders([])`. Neither passes a warning to `SkillForm`. CreateSkillPopup also resets state at lines 88, 111, 145 (close/reset paths), which should clear the warning.

### Architecture and Layers Affected
- Store (Valtio, `skills.ts`): type only.
- Constants and types: `constants/skills.ts`, `types/entity/skill.ts`.
- Hook: `useSkillForm`.
- Components: `SkillBundleFilesSection` (logic), `SkillForm` (pass-through, probably no change), `NewSkillPage`, `CreateSkillPopup`.
- No API, routing or backend changes.

### Integration Points
- Backend `GET /v1/skills/config` and `POST v1/skills/import-bundle-preview` (contract only).
- `skillsStore.skillConfig` is read via `useSnapshot` in the section and in `useSkillForm` (max_content_length). `getSkillConfig` is called in a `useEffect` in `useSkillForm`.
- Only the section reads `bundle_seed_*` (grep confirms); no other consumers of the wrong key in src except tests.

### Patterns and Conventions
- Valtio `useSnapshot` for store reads; hooks use `useState` + `useCallback`; the form layer passes props down (no context).
- `InfoWarning` with `InfoWarningType.WARNING` renders the warning.
- Files carry an Apache licence header. Prettier/eslint run automatically via the Claude hook. Per AGENTS.md, only write or run tests when explicitly asked, and run `npm ci` before trusting gates. No new dependencies are needed.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/` exists: `patterns/state-management.md`, `components/component-patterns.md`, `testing/testing-patterns.md`, `quality-gates.md`. No skill-bundle specific guide was found (not read in depth).

### Architectural Decisions
- None recorded for the bundle warning. The spec.md is the authority. Non-goals: no client-side path validation, no backend changes, and no local per-file warning.

### Derived Conventions
- Warnings are plain strings produced in the section. The server warning is passed as an optional nullable string prop.

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/skills/components/__tests__/SkillBundleFilesSection.test.tsx`: mocks `skillsStore: { skillConfig: null }` (line 30). The "bundle ceiling warning" describe has 5 tests. "uses ceilings from skillConfig when available" (line ~103) uses the wrong key `bundle_seed_max_size_bytes: 5 MB`, which must change to `bundle_seed_max_total_size_bytes`. Other tests that assume the 10 MB default will break with the 50 MB fallback (size-exceeded and combined tests, plus the expected "limit 10.0 MB" text), so they need updating.
- `src/pages/skills/hooks/__tests__/useSkillForm.test.tsx`, `src/pages/skills/__tests__/NewSkillPage.test.tsx`, `src/store/__tests__/skills.test.ts` (no references to the bundle_seed keys), `src/pages/skills/utils/__tests__/skillBundleUtils.test.ts`.

### Testing Framework and Patterns
- Vitest + React Testing Library (`unit` and `integration` projects). `vi.mock` of `@/store/skills` with a mutable `skillConfig`, cast to `any`.

### Coverage Gaps
- No tests for `applyBundlePreview` retaining the warning, for warning precedence (server vs. local ceiling), for hiding after edit, or for clearing on `.md` import or a new ZIP. CreateSkillPopup has no visible test file (not verified).

---

## 5. Configuration and Environment

### Environment Variables
- None relevant.

### Configuration Files
- None. Limits come from the runtime `GET /v1/skills/config` response.

### Feature Flags and Deployment Concerns
- None.

---

## 6. Risk Indicators

- Behavior inversion: the existing `bundleCeilingWarning ?? savedBundleWarning` makes the local warning win. The spec requires the server warning to win until the user edits. This also changes the edit page (`EditSkillForm` passes `skill.bundle_warning`); watch for regressions there.
- "User edited" state must be reset when a new preview warning arrives (new ZIP after edits) and cleared when a `.md` is imported. Since the flag lives in the section, resetting it on a changed warning prop needs care. A ZIP re-import with an identical warning string would not retrigger a useEffect keyed on the string. Consider keying on a counter or object, or moving the "dirty" tracking into the hook (the `setCompanionFiles` wrapper already marks dirty, but `applyBundlePreview` also sets dirty, so it cannot be reused directly).
- Folder add/remove also counts as user edit per spec ("files or folders"). Note there is no folder-removal control; only add exists.
- Changing the fallback to 50 MB breaks existing tests that assume 10 MB (see Section 4).
- Duplicated import handlers in NewSkillPage and CreateSkillPopup mean changes must be made in both, plus popup reset paths (lines 88, 111, 145).
- No codegraph available; the repo was not indexed, so findings are grep-based.
- The thin warning is a plain string from the server (names files); potential XSS is not a concern since it is rendered as text through `InfoWarning` (not verified that InfoWarning does not use dangerouslySetInnerHTML).

---

## 7. Summary for Complexity Assessment

This is a small, frontend-only change touching the store type, constants, entity type, one hook, one section component, and two entry points (NewSkillPage, CreateSkillPopup), with SkillForm likely untouched because `savedBundleWarning` already flows through it. Estimated 7-8 source files plus 3-4 test files. There is no API, routing, backend or dependency change.

The work follows established patterns (props passing, `useState` in the hook, optional string props). The only non-trivial piece is the warning precedence in `SkillBundleFilesSection`: inverting the current `??` order and tracking a "user edited" flag that resets correctly when a new preview warning arrives, or when a `.md` import clears it. This also affects the edit page.

Test posture is mixed: the section and hook have unit tests, but they hide the wrong-key bug and assume a 10 MB default, so several need updating, and the new behaviors (precedence, clearing, hook retaining the warning) are uncovered. Overall risk is low to low-moderate, driven by the state-reset edge cases and duplicated handlers.
