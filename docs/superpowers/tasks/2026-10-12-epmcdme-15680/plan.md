# EPMCDME-15680 Git Files Filter placeholder examples Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Show folder/nested-path examples in the Files Filter placeholder of Git data sources only, with no change to filter behavior.

**Architecture:** Add a Git-specific placeholder constant and pass it from `IndexTypeGit` through the existing `placeholder` prop of `FilesFilterField` (plus a new optional `rows` prop). The shared `FILE_FILTER_PLACEHOLDER` stays untouched, so SVN, FAQ and SharePoint are unchanged.

**Tech Stack:** React 18, TypeScript, react-hook-form, Vitest + RTL.

**Spec:** none (inline requirements, ticket EPMCDME-15680). Research: `technical-analysis.md` in this folder.

Commit per task using the repository's existing convention (ticket-prefixed, see `.ai-run/guides/standards/git-workflow.md`).

## Acceptance criteria

- [ ] Git Files Filter placeholder shows examples in addition to the existing `*.py`, `*.txt`, `debug.log*`.
- [ ] Placeholder contains verbatim: `*.py`, `*.txt`, `debug.log*`, `/<folder_name>/*`, `/<folder_name>/*/*.cs`.
- [ ] Examples are readable: `#` comment lines label each group and all lines are visible without scrolling on the create and edit forms.
- [ ] Every example line behaves as its label says under the backend filter (`check_file_type`, pathspec gitwildmatch).
- [ ] SVN, FAQ and SharePoint placeholders are unchanged; no filter or backend behavior changed.

## Global Constraints

- Do not edit `FILE_FILTER_PLACEHOLDER` (`src/constants/dataSources.ts:112-115`); it is shared with SVN, FAQ and SharePoint.
- Comment lines in the placeholder must use `#` (valid filter syntax); no label may claim behavior the backend lacks.

## Review Focus

- A user copying the placeholder verbatim: `#` lines are ignored and `<folder_name>` is a literal to replace.
- `/<folder_name>/*/*.cs` matches exactly one level below the folder, so its label must say so; `/**/` covers any depth.
- Non-Git `FilesFilterField` callers must keep 4 rows and the old placeholder.

---

### Task 1: Git placeholder, rows prop, and pinning test

**Files:**
- Modify: `src/constants/dataSources.ts` (add export after line 115)
- Modify: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/shared/FilesFilterField.tsx:27-34,36-43,53` (add optional `rows?: number` prop, default `4`, passed to `Textarea` in place of the literal `rows={4}`)
- Modify: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeGit.tsx:133` (pass `placeholder={GIT_FILE_FILTER_PLACEHOLDER}` and `rows={9}`; import the constant)
- Test: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/shared/__tests__/FilesFilterField.test.tsx` (new; copy license header and imports style from the neighbouring `IntegrationSection.test.tsx`)

**Interfaces:**
- Produces: `export const GIT_FILE_FILTER_PLACEHOLDER: string`; `FilesFilterField` prop `rows?: number`.

**Test-first: yes — FilesFilterField test asserts GIT_FILE_FILTER_PLACEHOLDER contains the five ticket patterns as whole lines and the textarea gets the passed `rows`; fails because the constant and prop do not exist.**

- [ ] **Step 1: Write the failing test.** Wrap `FilesFilterField` in a small component using `useForm()` for `control`/`errors`. Cases: (a) `GIT_FILE_FILTER_PLACEHOLDER.split('\n')` includes each of `*.py`, `*.txt`, `debug.log*`, `/<folder_name>/*`, `/<folder_name>/*/*.cs`; (b) rendering with `placeholder={GIT_FILE_FILTER_PLACEHOLDER}` and `rows={9}` shows that placeholder (`getByPlaceholderText`) and `rows` attribute 9; (c) default render uses `FILE_FILTER_PLACEHOLDER` and `rows` 4 (guards SVN/FAQ/SharePoint); (d) every non-comment, non-blank line of the Git placeholder is either one of the five patterns or `/<folder_name>/**/*.cs`.
- [ ] **Step 2: Run** `npx vitest run --project unit <test path>` (check `vite.config.ts` `test.projects` globs; use `integration` if that is where `shared/__tests__` lands). Expected: FAIL, missing export.
- [ ] **Step 3: Implement.** Add the new constant in `dataSources.ts` with a comment that it is Git-only and the shared one stays for SVN/FAQ/SharePoint:

```ts
export const GIT_FILE_FILTER_PLACEHOLDER = `# Files with this name or extension, in any folder
*.py
*.txt
debug.log*
# Everything inside a folder
/<folder_name>/*
# .cs files exactly one folder below it
/<folder_name>/*/*.cs
# .cs files at any depth below it
/<folder_name>/**/*.cs
`
```

Then the prop plumbing and `IndexTypeGit` override described under Files. Leave the local `FILES_FILTER_TOOLTIP` in `FilesFilterField.tsx` as is.
- [ ] **Step 4: Run the test again.** Expected: PASS.
- [ ] **Step 5: Commit** (ticket-prefixed per repo convention).

### Task 2: Cross-check placeholder against the real backend filter

**Files:**
- None committed. Reuse the user's `/tmp/epmcdme-15680-validate.sh` (or recreate it in `/tmp`); do not add it to the repo.

**Test-first: no — verification against the backend; nothing to fail first.**

- [ ] **Step 1:** Extract the non-comment lines from `GIT_FILE_FILTER_PLACEHOLDER` in `src/constants/dataSources.ts`, substitute `<folder_name>` with a real folder (e.g. `src`), and run each as a single-line filter through `check_file_type` (`/Users/paulius_labanauskis/source/EPM-CDME/codemie-dev/codemie/src/codemie/core/utils.py:275`, via the backend poetry env) over `git ls-files` of a throwaway repo containing `a.py`, `n.txt`, `debug.log`, `debug.log.1`, `src/Foo.cs`, `src/a/Bar.cs`, `src/a/b/Baz.cs`, `x/y.py`. Also run the whole placeholder (comments included) as one multi-line filter to confirm `#` lines are ignored. Print `pathspec.__version__`.
- [ ] **Step 2:** Confirm each result matches its comment: `*.py`/`*.txt`/`debug.log*` at any depth; `/src/*` all depths under src; `/src/*/*.cs` only `src/a/Bar.cs`; `/src/**/*.cs` all three `.cs` files. Any mismatch means the label in Task 1 is wrong; fix the constant and re-run the Task 1 test.
