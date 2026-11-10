# Technical Research

**Task**: data-sources files-filter git placeholder (EPMCDME-15680)
**Generated**: 2026-10-12
**Research path**: codegraph

---

## 1. Original Context

task_context (verbatim ticket EPMCDME-15680 "Improve Files Filter placeholder examples for data sources"):

## Summary
Improve the Files Filter placeholder examples for Git-based data sources.

## Description
The Files Filter field in the Git-based data source configuration currently provides only basic examples. Add folder- and extension-based path examples so users can better understand the supported filter syntax and configure data source indexing more precisely. The examples should make it clear that filters can target a folder and files in nested folders.

## Preconditions
- The user has access to create or edit a Git-based data source.
- The data source configuration form displays the Files Filter field.
- The repository contains folders and files that can be matched by filter patterns.

## Scenarios of Use
1. A user opens the creation or editing form for a Git-based data source.
2. The user views the placeholder or hint text in the Files Filter field.
3. The user sees the existing filename and extension patterns and new folder-based examples.
4. The user uses these examples as a reference to configure the intended indexing scope.

## Affected Areas
- Data Sources creation and edit UI
- Git-based data source configuration
- Files Filter field placeholder or contextual guidance

## Acceptance Criteria
1. The Files Filter field provides examples in addition to the existing simple filename patterns.
2. The displayed examples include the following patterns:
```
*.py
*.txt
debug.log*
/<folder_name>/*
/<folder_name>/*/*.cs
```
3. The examples are displayed in a clear, readable format in the field placeholder or adjacent help text.
4. Existing filter behavior is not changed; this task only improves user guidance.
5. The examples accurately reflect the filter syntax supported by the application.

Additional user context: primarily affects the `codemie-ui` repo (cwd /Users/paulius_labanauskis/source/EPM-CDME/codemie-dev/codemie-ui, branch EPMCDME-15680_git-filters). The user wants the filters actually validated against a local Git repository, so research should also identify HOW the "files filter" is evaluated on the backend (sibling repo, likely /Users/paulius_labanauskis/source/EPM-CDME/codemie-dev/codemie — gitignore-style/pathspec/fnmatch/glob semantics? leading slash anchoring? include vs exclude?) so the examples are accurate (AC 5), and how to test them locally.

---

## 2. Codebase Findings

### Existing Implementations

Frontend (`codemie-ui`):
- `src/constants/dataSources.ts:112-115` — `FILE_FILTER_PLACEHOLDER`, currently exactly three lines (`*.py`, `*.txt`, `debug.log*`, plus a trailing newline). This is the "existing basic examples" the ticket refers to.
- `src/constants/dataSources.ts:117-132` — `FILES_FILTER_TOOLTIP` (exported). SharePoint-oriented text (glob, `!` exclude, folder paths such as `/Shared Documents/General/PoC/*`, SharePoint URLs). Used only by `SharePointContentTypesSection.tsx`.
- `src/pages/dataSources/components/DataSourceForm/IndexTypeField/shared/FilesFilterField.tsx` — the shared Files Filter field (react-hook-form `Controller`, name `filesFilter`, `Textarea` rows=4). Defaults: `placeholder = FILE_FILTER_PLACEHOLDER`, `helperText = 'Specify file extensions or names to include in indexing. Leaving empty will index all files.'`, `tooltip = FILES_FILTER_TOOLTIP`. NOTE: this file declares its own local, non-exported `FILES_FILTER_TOOLTIP` (lines 23-25, three bullets: `*.py` include, `!*.nupkg` exclude, `*.py + !test_*.py` combined) which shadows the same-named exported constant in `constants/dataSources.ts`. The three-bullet local one is what Git users see in the info tooltip.
- `.../IndexTypeField/IndexTypeGit.tsx:133` — renders `<FilesFilterField control errors />` with no overrides, so Git uses all defaults.
- `.../IndexTypeField/IndexTypeSvn.tsx`, `.../IndexTypeField/IndexTypeFaq.tsx` — also call `FilesFilterField` (same component, same placeholder).
- `.../IndexTypeField/SharePointContentTypesSection.tsx:76` — uses `FILE_FILTER_PLACEHOLDER` directly for "Document Files Filter" (SharePoint).
- `src/types/entity/dataSource.ts:221` — `sharepoint.files_filter?: string` type (not Git related).

Backend (`codemie`, sibling repo) — how the filter is evaluated (this is the source of truth for AC 5):
- `src/codemie/core/utils.py:231-272` `_create_pathspec_from_filter(files_filter)` (lru_cache 128): splits the filter on lines, `strip()`s each line, skips empty lines and lines starting with `#`, lines starting with `!` become EXCLUDE patterns (the `!` removed), all other lines are INCLUDE patterns. Builds two `pathspec.PathSpec.from_lines('gitwildmatch', ...)` objects (include, exclude) and returns `(include_spec, exclude_spec, has_include_patterns)`. Logs info when more than 20 patterns.
- `src/codemie/core/utils.py:275-320` `check_file_type(file_name, files_filter, repo_local_path, excluded_files)`:
  1. strips the `repo_local_path` prefix (`file_name[len(repo_local_path)+1:]`) so the matched path is repo-relative with no leading slash;
  2. rejects if `os.path.splitext(file_name)[1]` is in `excluded_files` (global excluded extensions, applied BEFORE the user filter);
  3. empty/whitespace filter returns True (index everything);
  4. if the exclude spec matches, return False (exclusion wins);
  5. if any include patterns exist, return `include_spec.match_file(file_name)`; else True.
- `src/codemie/datasource/loader/git_loader.py:252-274` `GitBatchLoader.create_loader` wires `file_filter=lambda file_path: check_file_type(file_name=file_path, files_filter=repo.files_filter, repo_local_path=repo_local_path, excluded_files=CODE_CONFIG.excluded_extensions.get_full_code_exclusions())`; `_is_filtered` (line 401) applies it per blob in `lazy_load` (`repo.tree().traverse()`), after submodule/symlink/non-blob/mime-type skips.
- `src/codemie/datasource/loader/git_faq_loader.py:105-120` `_is_faq_file` — same `check_file_type` with a repo-relative path (posix separators) and only `.md` files.
- `src/codemie/datasource/loader/svn_loader.py:156-170` `_should_skip` — same `check_file_type` with repo-relative `rel_path`.
- `src/codemie/datasource/loader/sharepoint_loader.py:896` `_should_skip_by_files_filter` — also reuses `_create_pathspec_from_filter`, so SharePoint shares the gitwildmatch engine (plus SharePoint URL/path normalization, out of scope here).
- `src/codemie/workflows/nodes/generate_documents_tree.py:41` `_filter_by_file_type` — another `check_file_type` caller (workflow documents tree).

### Architecture and Layers Affected
- Presentation layer only (React form): constants module `src/constants/dataSources.ts` -> shared field component `FilesFilterField.tsx` -> per-type form section `IndexTypeGit.tsx` -> `DataSourceForm`.
- Both create (`DataSourceCreatePage`) and edit (`DataSourceEditPage` -> `DataSourceForm`) pages render the same `DataSourceForm`/`IndexTypeField`, so one change covers both scenarios in the ticket.
- No store, API or type layer is involved for a guidance-only change. Backend filter evaluation is read-only context.

### Integration Points
- `FILE_FILTER_PLACEHOLDER` is imported by exactly two places (codegraph blast radius): `FilesFilterField.tsx` (Git, SVN, FAQ) and `SharePointContentTypesSection.tsx` (SharePoint). Editing the shared constant changes the placeholder for ALL of those data source types, not just Git.
- `FilesFilterField` has three callers: `IndexTypeGit`, `IndexTypeSvn`, `IndexTypeFaq`. It accepts `placeholder`, `helperText`, `tooltip` props, so per-type overrides are an existing capability.
- `Textarea` (`src/components/form/Textarea`) renders the `placeholder` prop; `TooltipButton` renders the tooltip text.
- Frontend-to-backend contract: form field `filesFilter` is sent to the backend as `files_filter` and stored on `GitRepo.files_filter`; the same string is evaluated by `check_file_type`. No frontend validation of the pattern syntax was found in the explored files (error prop is wired to `errors.filesFilter?.message`, source of the validation schema not inspected).

### Patterns and Conventions
- Shared constants for UI copy live in `src/constants/dataSources.ts`; guide `.ai-run/guides/development/constants-usage.md` says extract when used in 2+ places (placeholder is used in 2 files).
- Field components expose overridable `placeholder`/`helperText`/`tooltip` props with defaults from constants.
- Placeholders are multi-line template literals (already the case).
- Component code follows `.ai-run/guides/components/component-patterns.md` and `.ai-run/guides/patterns/form-patterns.md`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
Relevant guides present in `.ai-run/guides/` (index in `AGENTS.md`): `development/constants-usage.md` (read), `components/component-patterns.md`, `patterns/form-patterns.md`, `patterns/accessibility-patterns.md`, `testing/testing-patterns.md`, `testing/local-verification.md`, `quality-gates.md`, `standards/git-workflow.md`. Backend guides (sibling repo) include `.ai-run/guides/integration/faq-git-integration.md` (Git FAQ datasource, mentions files filter reuse) and `.ai-run/guides/testing/testing-patterns.md`; none were read for filter semantics because the authoritative source is the code in `core/utils.py`.

### Architectural Decisions
- Backend docstring (`core/utils.py`) records the intended contract: empty = all files; `Patterns` = whitelist; `!Patterns` = blacklist; combined = include except `!`. Syntax is explicitly "gitignore-like" (`gitwildmatch`).
- Repo rule from AGENTS.md: write or run tests only when the user explicitly asks; formatting is automated by a PostToolUse hook.

### Derived Conventions
- Backend semantics derived from reading `pathspec` gitwildmatch behaviour (library source not available locally, see Section 6): patterns without a leading `/` or inner `/` match at any depth; a leading `/` anchors to the repo root; `*` does not cross `/`; `**` crosses directories; a pattern not ending in `/` matches a file or a directory and everything beneath it.

---

## 4. Testing Landscape

### Existing Coverage
Frontend:
- No tests found for `FilesFilterField`, `IndexTypeGit`, `FILE_FILTER_PLACEHOLDER` or `FILES_FILTER_TOOLTIP` (codegraph: "no tests found within 3 caller hops" for both `FilesFilterField` and `FILE_FILTER_PLACEHOLDER`).
- Neighbouring tests under `src/pages/dataSources/components/DataSourceForm/IndexTypeField/`: `__tests__/JiraCustomFieldsField.test.tsx`, `shared/__tests__/IntegrationSection.test.tsx`.
- Page-level tests: `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx`, `DataSourcesPagination.integration.test.tsx`, `DataSourcesPage.accessibility.test.tsx`.

Backend (filter semantics already covered, in `tests/codemie/datasource/loader/test_git_loader.py`):
- `test_check_file_type_excluded_file` (L202), `..._no_file_filter_specified` (L211), `..._gitignore_syntax` (L217, `*.py`), `..._syntax_exclusion` (L229, `*.py` + `!example.py`), `..._multiline` (L242, comments plus `!example_folder/example_file.txt`), `..._excluded_files` (L265).
- `tests/codemie/datasource/loader/test_git_faq_loader.py` — files-filter tests incl. directory exclusion with trailing slash.
- `tests/codemie/datasource/sharepoint/test_sharepoint_loader.py` — include/exclude/empty/whitespace filter.
- `tests/codemie/workflows/nodes/test_generate_documents_tree.py` — `_filter_by_file_type`.
- None of these exercise the new proposed patterns `/<folder>/*` and `/<folder>/*/*.cs` (leading-slash anchored folder patterns) in the Git test file.

### Testing Framework and Patterns
- Frontend: Vitest + React Testing Library, two projects (`unit`, `integration`) per `AGENTS.md`; single file run: `npx vitest run --project <unit|integration> <path>`. Run `npm ci` first.
- Backend: pytest/unittest style (`unittest.TestCase` with `self.assertTrue`), `poetry`-based environment, Makefile targets (see backend `.ai-run/guides/development/local-testing.md`).

### Coverage Gaps
- No UI test asserts the placeholder/tooltip text for the Files Filter field.
- No backend test for root-anchored folder patterns (`/folder/*`, `/folder/*/*.cs`) through `check_file_type`.

---

## 5. Configuration and Environment

### Environment Variables
- None relevant to the placeholder text. Backend `config.REPOS_LOCAL_DIR` governs where repos are cloned (used in `git_faq_loader.create_loader`), relevant only for running the real loader locally.

### Configuration Files
- Backend `CODE_CONFIG.excluded_extensions.get_full_code_exclusions()` (used in `GitBatchLoader.create_loader`) supplies a global extension deny-list that is applied before the user's filter (an included `*.xyz` can still be dropped if `.xyz` is on that list). The file defining it was not opened.
- Backend `pyproject.toml` / `poetry.lock` pin the `pathspec` version; not read (see Section 6).

### Feature Flags and Deployment Concerns
- No feature flag found for the Files Filter field. The change is static copy.

---

## 6. Risk Indicators

- Shared constant blast radius: `FILE_FILTER_PLACEHOLDER` (`src/constants/dataSources.ts:112`) feeds Git, SVN, FAQ (via `FilesFilterField`) and SharePoint (`SharePointContentTypesSection.tsx:76`). The ticket scopes to Git-based sources; editing the constant in place also changes the others. Backend uses the same engine for all, so the patterns are valid for them, but SharePoint folder semantics differ (see its tooltip).
- Duplicate/shadowed tooltip constant: `FILES_FILTER_TOOLTIP` exists both as an export in `constants/dataSources.ts` (SharePoint wording) and as a local const in `FilesFilterField.tsx` (generic 3 bullets). Easy to edit the wrong one; if "adjacent help text" is chosen over the placeholder, the local const is the one Git users see.
- AC 2 vs AC 5 tension: the exact AC example `/<folder_name>/*/*.cs` matches `.cs` files exactly ONE directory level below the folder (by gitwildmatch reading; `*` does not cross `/`). It does NOT match `folder/a/b/File.cs`. The ticket text says examples "should make it clear that filters can target ... files in nested folders". Whether `/folder/*/*.cs` demonstrates "nested" adequately, versus `/folder/**/*.cs`, is a content decision to make from the verified behaviour. Not validated by execution (no shell was available to this agent).
- Unverified behaviours that the user wants validated against a real repo (all by code reading only, not executed): (a) `/<folder>/*` matches files at every depth under the folder (pathspec appends the "and everything beneath" suffix); (b) `*.py`, `*.txt` and `debug.log*` are unanchored so they match at any depth, including inside folders; (c) `debug.log*` also matches `debug.log.1`, `debug.log` and directories named `debug.log*` and their contents; (d) the literal `<folder_name>` angle brackets are placeholders only, a user copying them verbatim gets a pattern that matches nothing meaningful.
- `pathspec` version not determined (not installed in any local venv; `poetry.lock` not read). gitwildmatch edge-case behaviour (e.g. the `(?:/.*)?` suffix and `**` handling) is version dependent in older releases, so the validation run should print `pathspec.__version__`.
- Placeholder is a native `placeholder` attribute on a `rows={4}` `Textarea`; five lines of examples may clip or scroll at 4 rows, and placeholders disappear on input and have weak contrast (accessibility guide applies). Whether row count or adjacent help text needs adjusting is a UI decision for spec.
- Include vs exclude subtlety not in the AC: any non-`!` line makes the filter a whitelist; a filter consisting only of `!` lines includes everything else. Users mixing placeholder lines into a real filter will therefore restrict indexing to only those lines.
- Speculative: adding folder examples to the shared constant may warrant per-type override via the existing `placeholder` prop on `FilesFilterField` if SharePoint/SVN/FAQ should remain unchanged. This is a design choice for the spec, not a discovered constraint.
- Speculative: a UI unit test pinning the placeholder string would be new coverage; the repo rule says only write tests when explicitly asked.

How to validate locally (derived from the code, none of it executed by this agent):
1. Create a throwaway git repo with files such as `a.py`, `notes.txt`, `debug.log`, `debug.log.1`, `src/app.py`, `docs/x.md`, `Services/Api/Foo.cs`, `Services/Api/Deep/Bar.cs`, `Services/Baz.cs`, `Other/Services/Api/Foo.cs`, then `git add`/`commit`.
2. Fast path (real engine, no infra): from the backend repo (`/Users/paulius_labanauskis/source/EPM-CDME/codemie-dev/codemie`) in its poetry env, run Python that imports `check_file_type` from `codemie.core.utils` and loops over `git ls-files` output of the temp repo with `repo_local_path=""` (or the repo path) and `excluded_files=[]` for each candidate filter, e.g. `"/Services/*"`, `"/Services/*/*.cs"`, `"/Services/**/*.cs"`, `"*.py\n*.txt\ndebug.log*"`, `"*.py\n!src/*"`. Print `pathspec.__version__` alongside.
3. Full path (real loader): build a `GitBatchLoader` against the temp repo (file:// or path clone URL) with a `file_filter` lambda calling `check_file_type`, and call `fetch_remote_stats()` / `lazy_load()` to see which files are indexed. `_init_repo` clones when `clone_url` is set. This is more setup than step 2 and its local-path behaviour was not verified.
4. Optional cross-check of real git semantics: `git ls-files -- ':(glob)...'` or a `.gitignore` in a scratch repo with `git check-ignore`, noting gitignore and pathspec gitwildmatch intentionally mirror but are not identical.

---

## 7. Summary for Complexity Assessment

The change as described touches only the presentation layer of `codemie-ui`: the placeholder constant `FILE_FILTER_PLACEHOLDER` in `src/constants/dataSources.ts` and, optionally, the help text/tooltip in the shared `FilesFilterField.tsx` rendered by `IndexTypeGit.tsx`. Create and edit pages share one form, so the surface is one to three files with no store, API, type or routing involvement. The backend is read-only context: the filter is a gitignore-style `pathspec` (`gitwildmatch`) include/exclude list evaluated in `check_file_type` (`codemie/src/codemie/core/utils.py`), with `!` for excludes, `#` comments, trailing-whitespace stripping and a global extension deny-list applied first.

Technical novelty is low; the work is copy plus a decision about scope (the placeholder constant is shared with SVN, FAQ and SharePoint, and the tooltip constant exists in two places). The real research risk is accuracy (AC 5): the ticket's example `/<folder_name>/*/*.cs` matches only one directory level below the folder by reading gitwildmatch, which may not communicate "nested folders" as intended. The user wants this checked against a real local git repository, and the agent had no shell to execute it, so the semantics reported here are derived by code reading and flagged unexecuted; a short Python run against `check_file_type` with a temp repo is the cheapest validation.

Test posture: no frontend tests cover `FilesFilterField` or the placeholder constants, while the backend has solid `check_file_type` tests that do not include root-anchored folder patterns. Per repo rules tests are written only on explicit request. Key risk factors are shared-constant blast radius, the shadowed `FILES_FILTER_TOOLTIP`, textarea row/placeholder legibility with five example lines, and the unverified `pathspec` version.

---

## 8. External References

None named by the task as files or URLs. The user did name the sibling repo `/Users/paulius_labanauskis/source/EPM-CDME/codemie-dev/codemie` as the likely place of backend evaluation; it resolved and was explored with codegraph (it has its own `.codegraph/` index). Facts the task needs from it, close enough to quote:
- `check_file_type` / `_create_pathspec_from_filter` in `/Users/paulius_labanauskis/source/EPM-CDME/codemie-dev/codemie/src/codemie/core/utils.py` (lines 231-320).
- Docstring contract: "Empty filter: Include all files; Patterns (e.g., *.py): Include ONLY matching files (whitelist); !Patterns (e.g., !*.nupkg): EXCLUDE matching files (blacklist); Combined (e.g., *.py + !test_*.py): Include .py files except test_*.py files". Engine: `pathspec.PathSpec.from_lines('gitwildmatch', ...)`; lines are `strip()`ped, blank lines and `#` comments skipped; exclusions are checked first; path matched is repo-relative (repo_local_path prefix removed).
- Existing tests: `/Users/paulius_labanauskis/source/EPM-CDME/codemie-dev/codemie/tests/codemie/datasource/loader/test_git_loader.py` lines 202-275.
