# Technical Research

**Task**: tooltip codeblock popup workflow-yaml
**Generated**: 2026-10-08T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Fix tooltip overlap/stuck-open bug on the Download button in the workflow YAML code-block expand popup (QA feedback on EPMCDME-10659). Scope: low-effort layout/config fix only — do NOT touch the legacy Edit Workflow configuration component issue (explicitly out of scope).

Root cause (already investigated by a prior exploration pass, verify but do not re-investigate from scratch):
1. Overlap: CodeBlockExpandPopup.tsx sets bodyClassName="!pt-0", so CodeBlock.tsx's header (title + Copy/Download buttons) renders almost flush against the Popup dialog's header where the close (X) icon lives. The Download button's tooltip is hardcoded to data-tooltip-place="top" in CodeBlock.tsx, so it pops up into that thin gap, overlapping the close icon. The global tooltip (src/utils/tooltip.ts) is styled z-[10000], above the dialog's own !z-50 stacking context, so it always paints over the close icon.
2. Won't disappear: the shared tooltip (src/utils/tooltip.ts) is configured clickable: true, which makes react-tooltip keep the tooltip open while the cursor travels through the 'safe polygon' between anchor and tooltip. Since the tooltip overlaps the close icon, moving the cursor from Download toward the close icon keeps it inside that polygon, so mouseleave never fires and the tooltip can get stuck open. tooltipCloseBehavior.ts only force-closes on anchor-scroll or anchor-unmount, nothing for this overlap case.

Expected fix approach (low effort, no architecture changes): adjust spacing/placement so the Download tooltip doesn't land under/over the Popup's close icon when rendered inside CodeBlockExpandPopup (e.g. restore some header padding instead of !pt-0, and/or change the Download tooltip placement to bottom/left when in this context), and reconsider whether clickable: true is appropriate for this tooltip instance given it causes the stuck-open behavior near overlapping controls. Verify the fix resolves both the overlap and the stuck-open tooltip when hovering Download inside the Expand popup.

Relevant files already identified:
- src/components/CodeBlock/CodeBlock.tsx (Download button tooltip, data-tooltip-place="top")
- src/components/CodeBlock/CodeBlockExpandPopup.tsx (bodyClassName="!pt-0")
- src/components/Popup/Popup.tsx (dialog header/close icon, z-50 mask)
- src/utils/tooltip.ts (global tooltip config, clickable: true, z-[10000])
- src/utils/tooltipCloseBehavior.ts (close-on-scroll/unmount logic)

Ticket: EPMCDME-10659 (follow-up QA fix).

---

## 2. Codebase Findings

### Existing Implementations

Root-cause claims verified by direct read of all five named files:

- `src/components/CodeBlock/CodeBlock.tsx` — the Download `<Button>` (lines 160–169) is the only element in the repo with a hardcoded `data-tooltip-place="top"` (confirmed by repo-wide grep — no other file sets this attribute). Expand and Copy buttons next to it use `data-tooltip-id`/`data-tooltip-content` only, no explicit `data-tooltip-place`, so they default to react-tooltip's auto-placement.
- `src/components/CodeBlock/CodeBlockExpandPopup.tsx` — passes `bodyClassName="!pt-0"` to `Popup`, which (per `Popup.tsx` line 211) is merged into `contentClassName` as `px-4 pt-4 overflow-auto flex-1 overflow-y-auto` + `!pt-0`, overriding `pt-4` to zero top padding on the dialog content wrapper. The `CodeBlock`'s own header sits immediately inside that content wrapper, so with `!pt-0` the code-block header (and its Download button) is pulled directly under the Popup's own header row.
- `src/components/Popup/Popup.tsx` — the Dialog's header (`pt.header`, line 234) holds the title and the close icon (`closeIcon={hideClose ? '' : <CloseSvg />}`, line 197); `pt.mask` is forced to `!z-50` (line 240). No z-index is set on the header/close icon beyond the dialog's own stacking context, so anything with a higher z-index (e.g. the global tooltip) paints over it.
- `src/utils/tooltip.ts` — single global `<Tooltip id="react-tooltip">` singleton, `clickable: true` (line 49), `className` includes `z-[10000]` (line 58) — above the Popup's `!z-50` mask. `clickable: true` was added deliberately for ticket EPMCDME-8421 (hoverable/dismissible tooltips) and is covered by a dedicated unit test asserting it stays `true` (see Testing section) — this is intentional, app-wide accessibility behavior, not an oversight.
- `src/utils/tooltipCloseBehavior.ts` — closes the tooltip only on (a) user-driven scroll that moves the anchor, or (b) the anchor leaving the DOM (via `MutationObserver`). There is no logic that detects "tooltip visually overlaps another interactive element" — confirms the ticket's claim that overlap-with-close-icon has no existing escape hatch.

All five root-cause claims in the task description are confirmed as-described.

### Architecture and Layers Affected

- **Shared component layer**: `src/components/CodeBlock/CodeBlock.tsx` (header buttons + tooltip attributes), `src/components/CodeBlock/CodeBlockExpandPopup.tsx` (popup wrapper/padding), `src/components/Popup/Popup.tsx` (generic dialog shell, used by many other callers — any Popup-level change has broad blast radius).
- **Shared utility layer**: `src/utils/tooltip.ts` (global singleton config), `src/utils/tooltipCloseBehavior.ts` (scoped close logic).

### Integration Points

- `Popup` is a generic, widely reused dialog shell (confirmed by `src/components/Popup/__tests__/Popup.test.tsx` and many non-CodeBlock callers across `src/pages/` and `src/components/`) — changes to `Popup.tsx` itself (e.g. header z-index, close-icon stacking) affect every dialog in the app, not just the Expand popup.
- `src/utils/tooltip.ts`'s `setupGlobalTooltip()` is the single choke point for every `data-tooltip-id="react-tooltip"` anchor in the codebase (grep found 27 files using `data-tooltip-place` alone, plus many more using `data-tooltip-id`/`data-tooltip-content` without an explicit place). Any change to `clickable` or `z-[10000]` there is global, not scoped to the Download button.
- `CodeBlock` is reused both inline (in chat/workflow views) and inside `CodeBlockExpandPopup` — a fix localized to `CodeBlock.tsx`'s Download tooltip placement would need to not regress the inline (non-popup) usage, where there is no close-icon overlap risk.

### Patterns and Conventions

- Tooltip opt-in is via HTML data attributes (`data-tooltip-id`, `data-tooltip-content`, optional `data-tooltip-place`, `data-tooltip-delay-show`) on any element, consumed by the single global `react-tooltip` singleton — this is the dominant pattern repo-wide (confirmed in the prior EPMCDME-8421 analysis and current grep).
- No per-instance tooltip override mechanism exists today (e.g. no second `Tooltip` id for "popup context" tooltips) — all consumers share one global config.
- `Popup` exposes `bodyClassName`, `overlayClassName`, `className`, and a `pt` prop-passthrough object for per-caller styling without touching `Popup.tsx` itself — this is the established extension point for spacing adjustments (`CodeBlockExpandPopup` already uses `bodyClassName` and `className="h-full"`).

---

## 3. Documentation Findings

### Guides and Architecture Docs

No `.ai-run/guides/` entry covers tooltip-specific patterns (confirmed previously in the EPMCDME-8421 analysis at `docs/superpowers/tasks/2026-07-17-EPMCDME-8421_fix-hoverable-dismissible-tooltips/technical-analysis.md`, still accurate). General component/styling guides (`component-patterns.md`, `styling-guide.md`) apply but have no tooltip-specific section.

### Architectural Decisions

- `clickable: true` and `globalCloseEvents: { escape: true, resize: true }` in `src/utils/tooltip.ts` are a recorded, deliberate decision from EPMCDME-8421 ("Fix hoverable/dismissible tooltips") — the inline comment at lines 50-55 and the dedicated test (`src/utils/__tests__/tooltip.test.ts`, line 46: `'renders the tooltip singleton with clickable: true so it stays visible when hovered'`) make this an intentional accessibility behavior, not an unexamined default. Disabling it globally would be a regression of that earlier fix.
- `globalCloseEvents.scroll` is deliberately left off app-wide, with scroll-closing handled narrowly in `tooltipCloseBehavior.ts` instead, specifically to avoid closing tooltips during chat-history auto-scroll (documented in both `tooltip.ts` comments and `tooltipCloseBehavior.ts`'s module docstring).

### Derived Conventions

- Component-local spacing/placement issues are conventionally fixed via the caller's prop surface (`bodyClassName`, `className`) rather than editing the shared component (`Popup.tsx`), per existing `CodeBlockExpandPopup` usage.
- Tooltip placement overrides are set per-anchor via `data-tooltip-place`; there is no established pattern yet for conditionally changing placement based on rendering context (inline vs. inside a popup) — `CodeBlock` currently has no `isInPopup`-style prop, only `isInChat`.

---

## 4. Testing Landscape

### Existing Coverage

- `src/utils/__tests__/tooltip.test.ts` — unit tests the `setupGlobalTooltip()` props (`clickable`, `globalCloseEvents.escape/resize/scroll`, `openEvents`) via a mocked `react-tooltip`/`createRoot`. No DOM-visibility or overlap assertions — it only checks the config object passed to `<Tooltip>`.
- `src/components/CodeBlock/__tests__/CodeBlock.integration.test.tsx` — covers font/CSS-variable rendering and `stickyHeader` wrapper classes. No test renders or clicks the Download button, no test covers tooltip attributes or `expandable`/`CodeBlockExpandPopup` rendering.
- `src/components/CodeBlock/__tests__/HtmlPreviewPopup.test.tsx`, `htmlPreviewSandbox.test.ts` — cover the separate HTML preview popup, not the Expand popup.
- `src/components/Popup/__tests__/Popup.test.tsx` — covers generic Dialog behavior (visibility, header/content/footer rendering, close-icon mock). No test asserts on z-index/stacking or tooltip interaction with the close icon.
- No test file exists for `CodeBlockExpandPopup.tsx` itself (confirmed by glob — only `CodeBlock.integration.test.tsx`, `HtmlPreviewPopup.test.tsx`, `htmlPreviewSandbox.test.ts` exist under `src/components/CodeBlock/__tests__/`).

### Testing Framework and Patterns

Vitest + React Testing Library (`@testing-library/react`, `@testing-library/user-event`), consistent with `.ai-run/guides/testing/testing-patterns.md`. Existing tooltip test mocks `react-dom/client` and `react-tooltip` to inspect the props object passed to `<Tooltip>` rather than rendering real DOM tooltip behavior — real hover/visibility interactions (e.g. "does the tooltip overlap the close icon", "does mouseleave fire") are not exercised anywhere in the current suite.

### Coverage Gaps

- No test exercises `CodeBlockExpandPopup` rendering, its `bodyClassName="!pt-0"`, or the Download button inside it.
- No test exercises actual tooltip placement/visibility geometry (react-tooltip's real positioning is not asserted anywhere — all existing tooltip tests mock the library).
- No regression test exists for "tooltip stuck open" behavior described in the ticket; any fix verification here will likely be manual/visual unless new tests are added for placement props or clickable scoping.

---

## 5. Configuration and Environment

### Environment Variables

None found related to tooltip or popup behavior.

### Configuration Files

- `src/utils/tooltip.ts` is the sole runtime configuration point for the global tooltip singleton (styling, open/close events, `clickable`).
- No separate config file governs `Popup` or `CodeBlock` spacing — all spacing is inline Tailwind classes in the components themselves.

### Feature Flags and Deployment Concerns

None found specific to this area.

---

## 6. Risk Indicators

- **`clickable: true` is global and intentionally added for EPMCDME-8421** (hoverable/dismissible tooltip accessibility fix), guarded by a unit test (`src/utils/__tests__/tooltip.test.ts:46-48`). Speculative: disabling or scoping `clickable` only for the Download-in-popup case would need either a second `Tooltip` instance/id (new infra) or a conditional per-anchor approach that `react-tooltip`'s single global singleton does not obviously support without changes beyond "low effort." Turning it off globally would regress the earlier accessibility fix and break its existing test.
- **`Popup.tsx` is reused by many unrelated dialogs** (confirmed via `Popup.test.tsx` and broad caller base) — any z-index/header-stacking change made directly in `Popup.tsx` risks affecting every dialog in the app, not just `CodeBlockExpandPopup`. A scoped fix (e.g. via `CodeBlockExpandPopup`'s own `bodyClassName`/`className`/tooltip-placement props) carries much lower blast radius than editing `Popup.tsx`.
- **No existing tests cover `CodeBlockExpandPopup` or the Download tooltip's placement/overlap** — any fix here lands with no regression safety net; verification will likely rely on manual/visual QA re-check per the ticket's own request ("verify the fix resolves both... when hovering Download inside the Expand popup").
- **`data-tooltip-place="top"` on Download is the only hardcoded placement in the codebase** — changing it to context-conditional (e.g. only inside the popup) requires either a new prop on `CodeBlock` (e.g. `downloadTooltipPlace`) or passing it through from `CodeBlockExpandPopup`, since `CodeBlock` currently has no notion of "is rendered inside a popup."
- **Real tooltip-positioning behavior (react-tooltip's actual geometry) is not covered by any existing test** — all current tooltip tests mock the library, so there is no established pattern in this repo for testing "does this tooltip visually overlap this other element," which may limit how much of the fix can be automatically verified vs. relying on manual QA re-check.

---

## 7. Summary for Complexity Assessment

This is a narrowly scoped, low-novelty UI fix touching three files at most: `CodeBlock.tsx` (Download button's `data-tooltip-place`), `CodeBlockExpandPopup.tsx` (the `!pt-0` body padding), and possibly `tooltip.ts`/`tooltipCloseBehavior.ts` if the stuck-open behavior needs more than a placement/padding change. All five root-cause claims in the ticket were verified directly against the source (not just trusted from the prior investigation): the hardcoded `top` placement on Download, the `!pt-0` padding collapse, the Popup's `!z-50` mask vs. the tooltip's `z-[10000]`, and `clickable: true`'s role in the stuck-open safe-polygon behavior are all confirmed as described.

The main risk is scope creep into shared infrastructure: `clickable: true` is a deliberate, tested, app-wide accessibility fix from an earlier ticket (EPMCDME-8421), and `Popup.tsx` is reused broadly, so a change that touches either file directly rather than scoping through `CodeBlockExpandPopup`'s/`CodeBlock`'s own prop surface risks unintended app-wide side effects or a regression of the earlier accessibility fix (and its guarding unit test). The lowest-risk path stays within `CodeBlock.tsx` and `CodeBlockExpandPopup.tsx` — e.g. restoring some top padding instead of `!pt-0`, and/or making the Download tooltip's placement conditional/configurable so it points away from the Popup's close icon when rendered inside the expand popup.

Test coverage posture is thin: no test today exercises `CodeBlockExpandPopup`, the Download button's tooltip attributes, or real tooltip-positioning geometry (existing tooltip tests mock `react-tooltip` entirely). Any fix will likely need new, narrowly scoped tests (e.g. asserting the rendered `data-tooltip-place` value changes in the popup context, or that `CodeBlockExpandPopup`'s body padding is non-zero) plus the manual/visual verification the ticket itself calls for, since geometric overlap and "tooltip stays open" are not practically assertable in the current RTL/jsdom setup.

---

## 8. External References

None named by the task — all referenced paths (`CodeBlock.tsx`, `CodeBlockExpandPopup.tsx`, `Popup.tsx`, `tooltip.ts`, `tooltipCloseBehavior.ts`) are inside this repository and were read directly as part of the normal codebase survey (Section 2), not as an external source of truth.
