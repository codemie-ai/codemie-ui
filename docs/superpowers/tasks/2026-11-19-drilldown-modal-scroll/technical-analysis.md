# Technical Research

**Task**: analytics cli-analytics drilldown modal popup scroll
**Generated**: 2026-11-19
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-17398 follow-up. The CLI Analytics drill-down modal (src/pages/analytics/components/cli-analytics/views/RepositoriesDrilldownModal.tsx, opened from the Projects table; levels: Repositories -> Branches -> Sessions via SessionsView) cannot be scrolled on small-height screens: Popup is fixed at 80dvh with overflow-hidden and Summary/list/sessions widgets share height via min-h-0, so the list collapses. Desired: the modal body scrolls like the user-details modal opened from the Users tab (src/pages/analytics/components/cliInsights/CLIInsightsUserDetailsModal.tsx). A working-tree change already exists (body overflow-y-auto, wrapper min-h-full, list widget min-h-[320px], SessionsView fillAvailableHeight min-h-[360px]); verify it against the code and identify existing tests (cli-analytics/__tests__/RepositoriesDrilldownModal.test.tsx) and how Popup/AnalyticsWidget size content.

---

## 2. Codebase Findings

### Existing Implementations
Purpose: modal body scrolls when content exceeds the viewport.
- `src/components/Popup/Popup.tsx`: wraps PrimeReact `Dialog`. Root class `h-auto max-h-[95%]` plus caller `className`. `contentClassName = cn('px-4 pt-4 overflow-auto flex-1 overflow-y-auto', bodyClassName)`; the body is therefore scrollable by default, and `bodyClassName` is merged via `cn` (tailwind-merge) so it overrides. Mobile: `fullScreenOnMobile` (default = `isFullWidth`) makes it a full sheet below sm.
- `CLIInsightsUserDetailsModal.tsx` (reference): `<Popup className="w-[96vw] max-w-[1720px]" hideFooter>` with no fixed height and no bodyClassName; content is a natural-height `flex flex-col gap-6 pb-6`; dialog grows to `max-h-[95%]` and the Popup default body scrolls.
- `RepositoriesDrilldownModal.tsx` (before the working-tree change): `className="!h-[80dvh] !min-h-[80dvh] !max-h-[80dvh]"`, `bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden !p-4"`, wrapper `h-full min-h-0`, active section `min-h-0 flex-1`, `listWidgetClass` with `min-h-0 flex-1` plus arbitrary-variant selectors forcing `.widget-content`, `.relative` and last child to flex/min-h-0. The inner list div (`ListFrame`, `min-h-0 flex-1 overflow-y-auto`) is the only scroller, with `listRef`/`onScroll` saving scrollTop per stack entry (`savedScrollTop` restored in `useEffect` on activation).
- `AnalyticsWidget.tsx`: root `div` with `p-6` (callers override), header, then `div.widget-content.min-w-0` containing `div.relative` with `style minHeight: minLoadingHeight` (default 80px) containing a content `div`. No height of its own; callers size it through className selectors, which is why `listWidgetClass` and the SessionsView string target `.widget-content`, `.relative`, `div:last-child`.
- `SessionsView.tsx:137,153,225-260`: prop `fillAvailableHeight` (only user is the drilldown modal, line ~601). Applies widget class string, inner wrapper `min-h-0 min-w-0 flex-1 flex-col`, and table wrapper `overflow-x-auto show-scroll min-h-0 min-w-0 flex-1`. Not changed by the working tree except `min-h-0` -> `min-h-[360px]` on the widget root.
- `Summary` in the modal is `shrink-0`.

### Decisions Already in the Code
- Fixed 80dvh dialog with a single inner scroller (list) was a deliberate choice (stable modal height across levels, per-level scroll restore). The working tree reverses it for the body only; `Popup` `className` still has `!h-[80dvh] !min-h-[80dvh] !max-h-[80dvh]` (unchanged in diff), so the dialog stays fixed at 80dvh and the body is now the scroller.
- Per-entry list scroll restore (`scrollPositions`, `savedScrollTop`) assumes the list div is the scroller.
- Inactive stack levels are kept mounted with `hidden` (state preserved).

### Task Statements Checked Against the Code
- "Popup is fixed at 80dvh with overflow-hidden": holds (`Popup` className `!h-[80dvh]...` and bodyClassName `overflow-hidden` at HEAD).
- "widgets share height via min-h-0, so the list collapses": holds for HEAD (`listWidgetClass` min-h-0, section min-h-0, wrapper h-full min-h-0).
- "scrolls like the user-details modal": partially differs: user-details has natural height (no fixed 80dvh); the drilldown keeps a fixed 80dvh box and scrolls its body. Not a contradiction of the desired behaviour, a difference of mechanism.
- Working-tree change verified as present in `git diff` (3 files; `.codemie/codemie-cli.config.json` also modified, unrelated).

### Consumers of Changed Contracts
- `SessionsView` `fillAvailableHeight`: single consumer, `RepositoriesDrilldownModal.tsx:~601`. Other `SessionsView` usages (non-fill) are unaffected. `SessionsView.test.tsx` has no class-based assertions on this prop (only one `italic` className check).
- `listWidgetClass`: used only by `ListFrame` in the same file (Repositories, Branches). Sibling `ProjectRepositoriesList.tsx` and `RepositoryBranchesList.tsx` exist in `views/` but were not examined for shared styling.

### Architecture and Layers Affected
Presentation only: `views/RepositoriesDrilldownModal.tsx`, `views/SessionsView.tsx`; shared `Popup` and `AnalyticsWidget` are read, not changed.

### Integration Points
Hooks `useCliAnalyticsProjectRepositories`, `useCliAnalyticsBranches`; `Table` (`embedded`), `Pagination`.

### Patterns and Conventions
Tailwind with arbitrary-variant selectors to reach into `AnalyticsWidget` internals; `cn`/tailwind-merge for class overrides; `!` important modifiers for Popup sizing.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (components, patterns, styling, testing). Not read in depth; styling guide `.ai-run/guides/styling/styling-guide.md` is the relevant one.

### Architectural Decisions
None found specific to this modal sizing.

### Derived Conventions
Dialogs either have natural height with Popup's default body scroll (user-details) or a caller-fixed height with caller-managed scrollers (this modal).

---

## 4. Testing Landscape

### Existing Coverage
`cli-analytics/__tests__/RepositoriesDrilldownModal.test.tsx` (tests at lines 144-224): project scope request, unattributed scope, loading, error + retry, empty state, pagination shown/hidden, drill repository -> branches -> sessions, unattributed repository opens sessions directly. None assert layout classes or scroll. `SessionsView.test.tsx` covers the sessions list. Scroll restoration (`savedScrollTop`) has no test seen.

### Testing Framework and Patterns
Vitest (`vite.config.ts` `test.projects`) with React Testing Library; hooks mocked at module level in the modal test.

### Coverage Gaps
No test asserts the body scroll classes; jsdom does not lay out, so layout is not verifiable by unit tests (browser verification per `local-verification.md`).

---

## 5. Configuration and Environment

No env vars or flags involved. Tailwind config only (arbitrary values `min-h-[320px]`, `min-h-[360px]` need no config).

---

## 6. Risk Indicators

- Speculative: with the dialog fixed at 80dvh and wrapper `min-h-full` (not a definite height), the list inner `min-h-0 flex-1 overflow-y-auto` div has no definite height ceiling, so on tall screens the list may grow to content and the body scrolls instead of the list; the per-entry list scroll restore (`savedScrollTop`) may then be a no-op for the body scroller, and body scrollTop is shared between stack levels.
- Speculative: Sessions table wrapper uses `overflow-x-auto`, which makes overflow-y compute to auto; combined with `min-h-[360px]` the table may show nested vertical scroll plus body scroll.
- `section` className ternary after the edit now fits on one line; Prettier/eslint (`quality-gates.md`) may flag it (not run).
- `Popup` fixed `!max-h-[80dvh]` still applies; on very short viewports the header consumes part of the 80dvh.
- Long `listWidgetClass` / SessionsView class strings duplicate the same selectors (existing maintenance cost).
- No automated test covers the scroll behaviour.

---

## 7. Summary for Complexity Assessment

The change is presentation-only, in two files (`RepositoriesDrilldownModal.tsx`, `SessionsView.tsx`), already present in the working tree as a small class-string diff (4 hunks). Layers touched: component styling only; `Popup` and `AnalyticsWidget` provide the sizing primitives (Popup body already `overflow-y-auto flex-1` by default; `AnalyticsWidget` has no intrinsic height and is sized via caller selectors).

No technical novelty; the reference modal differs by using natural height rather than a fixed 80dvh. Tests: one existing test file for the modal covers data/navigation but nothing about layout; layout cannot be unit tested in jsdom. Main risks are interaction between the nested scrollers (body vs list vs sessions table), the per-level list scroll restore, and lint formatting.

---

## 8. External References

None named by the task (the referenced files are in-repo and were read in Section 2).
