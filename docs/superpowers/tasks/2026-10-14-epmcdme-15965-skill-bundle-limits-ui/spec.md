# EPMCDME-15965 (frontend): Skill editor bundle limits and preview warning

Repo: `codemie-ui`. Follow-up bug from QA on EPMCDME-15558. The backend half (orphan skill on refused upload) is specified separately in the `codemie` repo.

## Problem

### A. Wrong total-size limit shown (QA TC-025)
- Backend `GET /v1/skills/config` (`codemie/.../rest_api/routers/skill.py`, `get_skill_config`) returns `bundle_seed_max_file_count`, `bundle_seed_max_file_size_bytes` and `bundle_seed_max_total_size_bytes`.
- UI `SkillConfig` (`src/store/skills.ts:45`) declares `bundle_seed_max_size_bytes`, a key the backend never sends. `SkillBundleFilesSection.tsx:62` reads it, gets `undefined`, and falls back to `MAX_SKILL_BUNDLE_SIZE_BYTES` (10 MB, `src/constants/skills.ts:46`).
- Result: the editor warns "limit 10.0 MB" while the backend seeds up to 50 MB total per bundle.
- The unit test (`SkillBundleFilesSection.test.tsx`, "uses ceilings from skillConfig") mocks the same wrong key, so it passes and hides the bug.
- Intended backend contract (confirmed by dev): 100 files, 10 MB per file, 50 MB total.

### B. Preview `bundle_warning` never displayed
- `POST v1/skills/import-bundle-preview` returns `bundle_warning` (names files an assistant workspace would not receive).
- `SkillBundlePreview` (`src/types/entity/skill.ts:57`) has no such field. `applyBundlePreview` (`src/pages/skills/hooks/useSkillForm.tsx:99`) drops it. `NewSkillPage` and `CreateSkillPopup` do not pass any warning to `SkillForm`.
- Only the locally computed warning shows, and it cannot detect per-file-size or invalid-path skips.

## Requirements

1. `SkillConfig` mirrors the backend response: `bundle_seed_max_file_count`, `bundle_seed_max_file_size_bytes`, `bundle_seed_max_total_size_bytes`.
2. The editor's total-size ceiling comes from `bundle_seed_max_total_size_bytes`. The fallback, used only when config has not loaded, becomes 50 MB (`MAX_SKILL_BUNDLE_SIZE_BYTES = 50 * 1024 * 1024`). The count fallback stays 100.
3. Per-file limit: add a `MAX_SKILL_BUNDLE_FILE_SIZE_BYTES = 10 MB` fallback constant and type field. The local warning is computed with the backend's bundle-seed rules and message format (`buildBundleWarning` in `skillBundleUtils.ts`): files taken in path order; a file is skipped when over the per-file limit, past the file-count limit, or when it would push the total over the limit; a skipped file never counts toward the total. Do not remove or rename existing exports other than the wrong config key.
4. After a ZIP preview, the server `bundle_warning` is shown in the bundle section on the New Skill page and the Create Skill popup.
5. Warning precedence in `SkillBundleFilesSection`: the server warning wins while the file list is unchanged by the user in this section; once the user adds or removes files or folders there, the stale server warning is hidden and the local ceiling warning applies. This also fixes staleness on the edit page.
6. Importing a plain `.md` file, or a new ZIP, replaces or clears the previous preview warning.

## Non-goals
- No client-side path-length validation.
- No backend changes.
- No change to the edit-page flow beyond requirement 5.

## Acceptance criteria
- With config `{max_file_count: 100, max_file_size_bytes: 10 MB, max_total_size_bytes: 50 MB}`, an 11 MB bundle of small files shows no warning; a single 11 MB file warns "1 file(s) exceed the 10 MB per-file limit (<path>)"; six 9 MB files warn "1 file(s) exceed the 50 MB total size limit (<path>)".
- With config unloaded, the limits are 100 files, 10 MB per file and 50 MB total.
- Uploading a ZIP whose preview has `bundle_warning: "X"` displays "X" in the New Skill page and popup.
- Adding a file after the preview hides "X". Importing a `.md` clears it.
- Existing tests pass. The section's "uses limits from skillConfig" test uses the real keys (`bundle_seed_max_total_size_bytes`, `bundle_seed_max_file_size_bytes`, `bundle_seed_max_file_count`).
