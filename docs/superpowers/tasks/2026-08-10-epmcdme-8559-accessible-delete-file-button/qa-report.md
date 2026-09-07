# QA gates — EPMCDME-8559

Branch: `EPMCDME-8559_accessible-delete-file-button` · base `main` @ `9562f9c9b`
Gates executed after the code-review fix-up commit `d19e6c9`.

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` | **PASS** — no violations. Only pre-existing output is the `eslint-plugin-react` "React version not specified" warning, unrelated to this change. |
| Typecheck | `npm run typecheck` (`tsc --noEmit`) | **PASS** — no output. |
| Unit | `npm run test:unit` | **PASS** — 366 files, 4185 tests. Baseline on `main` was 4177; the +8 are this task's new tests. |
| Integration | `npm run test:integration` | **PASS** — 35 files, 468 passed, 1 skipped (the skip is pre-existing). |
| Test-harness | `npm run test-harness` | **PASS** — 71 passed, 2 xpassed, 0 failed in 8:46. Run against a freshly recreated `codemie-ui` container (`docker compose up -d --force-recreate --no-deps codemie-ui`) so the stack served the branch under test; re-run at the final commit `07870ce`. |
| Feature verification | Playwright | **PASS** — before/after captured live against the running app; the After run also asserts the accessible name, Tab reachability and aria-hidden state read straight from the DOM. See below. |

## Per-gate detail

Gates were run twice: once after the initial implementation (unit 4177) and again after the
code-review fix-up (unit 4185). Both runs were clean; the numbers above are the post-fix run.

New tests added by this task (8):

- `FileListItem.test.tsx` — 7 total (5 initial + 2 added during fix-up: uploaded-section naming, focus indicator).
- `FileList.test.tsx` — 7 total (4 initial + 3 added during fix-up: duplicate-name disambiguation, focus moves to next row, focus falls back to previous row).
- `File.test.tsx` — 23 total (+1: delete icon hidden from assistive tech). The icon mocks in this file were changed to forward props; before that a props-swallowing stub would have made the assertion pass vacuously.
- `SkillBundleFilesSection.test.tsx` — new file, 2 tests (accessible name, icon hidden).

## Manual verification still owed (screen reader on)

Data Sources → Create Datasource → type **File**:

1. Add a file, `Tab` to the row's remove control — it must be reachable and show a visible focus ring.
2. Screen reader announces **"Delete selected file <name>, button"** (not "graphic clickable").
3. `Enter` and `Space` both remove the row.
4. After removing a middle row, focus lands on the next row's delete button.
5. With an already-indexed datasource open, an uploaded row announces **"Delete uploaded file <name>"** — distinct from a newly selected file of the same name.
6. Neither the file icon nor the X icon is announced separately.

Known limitation (recorded as a follow-up, not a regression): removing the **last** row drops
focus to `<body>`, because the drop area has no focusable element — its `<input type="file">` is
`display:none` and the dropzone itself is a plain `div` without `tabIndex`.


## Feature verification (live, Playwright against the running app)

Captured on Data Sources -> Create Datasource -> type **File**, one file added.

**Before (`main`)** — the defect, observed rather than assumed:
- `button` accessible names on the page: `Choose`, `Embeddings Model Type`, `Help`, ... — there is **no** control for removing the file at all.
- Six consecutive `Tab` presses walk Choose -> input -> Embeddings Model Type -> Help -> body -> logo. The `X` is never reached: it is not keyboard-operable.
- Exactly one `aria-hidden` svg on the page (a pre-existing, unrelated one).

**After (this branch)**:
- Accessible name present: `Delete selected file quarterly-report.pdf`, reached in **two** `Tab` presses from the file name.
- Three `aria-hidden="true"` svgs — the file icon and the X icon are now hidden from assistive tech.
- Focus indicator verified by computed style, not by eye: after `Tab` the button computes `outline: auto 2px rgb(0, 122, 255)`, i.e. the theme's `--colors-border-accent`.

### Note for reviewers — why the focus indicator is an outline and not a ring

The repo guide's example and the existing house style use `focus-visible:ring-*`. That does **not**
work in this project: the Tailwind palette is replaced by CSS-variable design tokens and
`--tw-ring-color` is never set, so *any* `ring-*` colour computes to transparent — verified in the
browser with both a token colour and core `ring-red-500`. Combined with `focus:outline-none`, the
first version of this fix produced a control with **no** visible focus state at all. The shipped
version styles the outline and binds it to the token directly.
