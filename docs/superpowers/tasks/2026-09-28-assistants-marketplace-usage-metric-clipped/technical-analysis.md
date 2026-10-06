# Technical Research

**Task**: assistants marketplace card usage metric
**Generated**: 2026-09-28T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Implement the fix for Jira ticket EPMCDME-14284: Assistants Marketplace: total used metric is clipped on assistant cards.

Problem: In the Assistants Marketplace card grid, the usage metric in the card footer is rendered unformatted as `${assistant.unique_users_count ?? 0} total uses` with a 12px gap (gap-3). On standard card widths (320px-360px), horizontal space is crowded by the left actions (chat button, like/dislike/clone counters, kebab menu), causing the usage metric to overflow the right card edge and clip (e.g. `22432 total us`, `937 total use`). Assistant `bcc7b39e-be3e-4081-bc38-8667d391d241` currently has 22,432 views set in the local Postgres DB for testing.

Specification & Design Requirements:
1. 0-999: Show exact integer (0, 35, 567, 999).
2. >= 1,000: Use compact notation with uppercase K (and M for millions): 1K, 1.2K, 20K, 20.9K, 22.4K, 999.9K.
3. No space before K: 20.9K (not 20.9 K).
4. Decimals: one decimal place only when needed (maximumFractionDigits: 1, round half-up: 1,249 -> 1.2K, 1,250 -> 1.3K). Whole thousands must not have .0 (1K, 20K).
5. Visible card label: display label with space after value: 22.4K uses (or 1 use for 1).
6. Tooltip on hover: show exact formatted value with thousands commas: 22,432 total uses (or 1 total use for 1).
7. Icon-to-value gap: exactly 4px (gap-1 in Tailwind instead of gap-3 / 12px).
8. Layout stability: no clipping, overlapping, or wrapping to a second line.

Implementation Details:
1. src/utils/helpers.ts: Add formatMetricCount(value?: number | string | null): string using Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 }). Keep existing formatCompactCount untouched as its lowercase 12k output is required by reaction counter tests. Add formatExactCount(value?: number | string | null): string (e.g., Number(value || 0).toLocaleString('en-US')) for tooltip numbers (22,432). Add comprehensive tests in src/utils/__tests__/helpers.test.ts.
2. src/pages/assistants/components/AssistantList/AssistantCard/StatusLabel.tsx: For StatusType.GLOBAL: render compact value `${formatMetricCount(count)} ${count === 1 ? 'use' : 'uses'}`; add tooltip displaying `${formatExactCount(count)} ${count === 1 ? 'total use' : 'total uses'}` on hover using PrimeReact Tooltip or data-pr-tooltip; update container class to gap-1 (4px) instead of gap-3; ensure whitespace-nowrap is maintained.
3. src/pages/assistants/components/AssistantList/AssistantCard/AssistantCard.tsx: Ensure the tertiary reaction buttons (Like, Dislike, Clone) override Button.tsx's default min-w-14 with min-w-0 and compact padding (px-1.5) so they do not push the right-aligned StatusLabel outside the card on 320px widths.
4. Tests: Update src/pages/assistants/components/AssistantList/AssistantCard/__tests__/StatusLabel.test.tsx to assert exact numbers for 0-999 (0 uses, 1 use, 42 uses), compact uppercase K notation for >=1000 (20.9K uses), gap-1 class on status element, tooltip with exact comma-separated count (20,872 total uses). Ensure AssistantCard.test.tsx passes.

---

## 2. Codebase Findings

### Existing Implementations

- `src/utils/helpers.ts:367-374` — `formatCompactCount(value?: number | string | null): string` already exists: `Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(Number(value) || 0).toLocaleLowerCase()`. Used by reaction counters (like/dislike/clone) in `AssistantCard.tsx` and by `AssistantDetailsProfile.tsx` for the assistant detail header's total-uses text. Lowercase output (`12k`, `1.2m`) is asserted by `src/utils/__tests__/helpers.test.ts:26-47` and by `AssistantCard.test.tsx` (which mocks the same lowercase formatter). Neither `formatMetricCount` nor `formatExactCount` exists yet — no compact-uppercase or comma-grouped exact formatter is present anywhere in `src/utils/helpers.ts`.
- `src/pages/assistants/components/AssistantList/AssistantCard/StatusLabel.tsx` — the exact file named in the ticket. `StatusType.GLOBAL` builds `${assistant.unique_users_count ?? 0} ${STATUS_TEXT.GLOBAL}` where `STATUS_TEXT.GLOBAL = 'total uses'` (line 30, line 58). The unformatted count is emitted directly into the visible label with no compact/exact split. Container: `<div role="status" aria-label={...} className="flex flex-row items-center text-xs gap-3 whitespace-nowrap">` (line 80-85) — `gap-3` is the 12px gap the ticket calls out. No tooltip is attached to this element currently (`data-pr-tooltip` absent).
- `src/pages/assistants/components/AssistantList/AssistantCard/AssistantCard.tsx` — renders `StatusLabel` via `renderStatus()` (line 274-276), passed into `Card` as the `status` prop. The three tertiary reaction buttons (Like, Dislike, Clone; lines 189-249) use `<Button type="tertiary" className={tooltipClass} ...>` with no width/padding override — they inherit `Button.tsx`'s `min-w-14` base class. `formatCompactCount` (lowercase) is imported and used for `unique_likes_count`, `unique_dislikes_count`, `clone_count` (lines 206, 232, 247) — these are explicitly out of scope per the ticket ("Keep existing formatCompactCount untouched").
- `src/components/Button/Button.tsx:41-121` — the shared Button component. Base classes always include `min-w-14` (line 65), overridden only when `isIconOnly` is true (`min-w-0`, line 66) — `isIconOnly` is computed from whether every child is a valid React element with no text nodes (`useIsIconOnly`, lines 21-28). The tertiary reaction buttons render an icon **and** a `<span>` text count as siblings, so `isIconOnly` is `false` and `min-w-14` (56px) applies to each of the three buttons regardless of any `className` passed — a `className` override for `min-w-0`/`px-1.5` on the `<Button>` usage is required to shrink them, consistent with the ticket's Implementation Detail 3.
- `src/pages/assistants/components/AssistantList/AssistantCard/getAssistantCardInfo.tsx` — unrelated helper (derives `isShared`/`isOwned`/`description`/`name`), not part of the fix surface but consumed by `AssistantCard`.
- `src/components/Card/Card.tsx:134-140` — the shared `Card` wrapper renders `actions` and, if present, wraps `status` in `<div className="flex flex-row ml-auto items-center text-xs gap-3">{status}</div>`. This outer `gap-3` is a *separate* gap (between the actions block and the status block, via `ml-auto` push), distinct from the `gap-3` inside `StatusLabel.tsx` itself (icon-to-text gap). The ticket's "gap-1 (4px)" requirement targets the inner `StatusLabel` container class, not this outer `Card` wrapper — the outer wrapper is not named in the ticket's implementation details and is a shared component used by other cards (e.g. `WorkflowCard.tsx`).
- **Related but out-of-scope duplicate pattern found**: `src/pages/assistants/components/AssistantDetails/components/AssistantDetailsProfile.tsx:33,56-61` formats `assistant.unique_users_count` with the existing lowercase `formatCompactCount` for the assistant detail page header (`{formattedTotalUses} total use(s)`), e.g. would render `22k total uses` rather than `22.4K total uses`. This file is not named in the ticket's implementation details and will retain the old lowercase format unless separately updated — flagged as a risk/inconsistency, not part of the required change.
- **Related but out-of-scope duplicate bug**: `src/pages/workflows/components/WorkflowMarketplace.tsx:22-27` has the identical unformatted-count/`gap-3` pattern (`${uniqueUsersCount} total ${uniqueUsersCount === 1 ? 'use' : 'uses'}`) for Workflow marketplace cards, and is rendered inside `WorkflowCard.tsx:306-309`. This is the same bug class on a sibling card type but is not named in the ticket and not in the implementation details list.

### Architecture and Layers Affected

- **Utility layer**: `src/utils/helpers.ts` — pure formatting functions, no React dependency. This is where `formatMetricCount` and `formatExactCount` are to be added, alongside the existing `formatCompactCount`, `pluralize`, `truncateInput`, etc.
- **Presentational component layer**: `src/pages/assistants/components/AssistantList/AssistantCard/StatusLabel.tsx` (leaf display component, `React.memo`-wrapped) and `AssistantCard.tsx` (composing component that also owns the reaction buttons and delegates to `Card`).
- **Shared component layer**: `src/components/Button/Button.tsx` and `src/components/Card/Card.tsx` are consumed, not modified, by this ticket — `Button` because its default `min-w-14` must be overridden per-usage via `className`, `Card` because it hosts the `status` slot.
- **Test layer**: `src/utils/__tests__/helpers.test.ts`, `src/pages/assistants/components/AssistantList/AssistantCard/__tests__/StatusLabel.test.tsx`, and `.../__tests__/AssistantCard.test.tsx`.

### Integration Points

- `StatusLabel` is rendered only from `AssistantCard.tsx` (`renderStatus()`), which is itself used across the Assistants Marketplace grid (`src/pages/assistants/components/AssistantList/`).
- `formatCompactCount` (existing) is imported by `AssistantCard.tsx` and `AssistantDetailsProfile.tsx`. `formatMetricCount`/`formatExactCount` (new) would be imported by `StatusLabel.tsx` only, per the ticket's implementation details.
- PrimeReact `Tooltip` (`primereact/tooltip`, wrapped locally, see below) is the existing hover-tooltip mechanism in this codebase, driven by a `data-pr-tooltip` attribute on the target element plus a `<Tooltip target={'.' + cssClass} .../>` instance mounted nearby (see `Card.tsx:68,96,121` and `AssistantCard.tsx:163`). `StatusLabel.tsx` currently mounts no `Tooltip` instance and has no tooltip target class — the ticket's Implementation Detail 2 says the tooltip may be added via PrimeReact `Tooltip` or a bare `data-pr-tooltip` attribute (the latter only works if an ancestor already has a `Tooltip` instance targeting a matching selector; `Card.tsx`'s own `Tooltip` targets `'.' + tooltipClass` built from `id`, not from any class inside `StatusLabel`, so `StatusLabel` would need its own `Tooltip` mount or its own class wired into an existing target selector).
- `Intl.NumberFormat` (native browser API) is the formatting primitive for both the existing `formatCompactCount` and the new `formatMetricCount`; no third-party number-formatting library is used in this codebase for this purpose.

### Patterns and Conventions

- Formatting helpers are plain exported functions in `src/utils/helpers.ts`, colocated with unrelated helpers (`formatDate`, `pluralize`, `humanize`, etc.) — no factory/registry pattern, no class-based formatter.
- Singular/plural text branches follow a repeated inline ternary idiom across the codebase: `count === 1 ? 'use' : 'uses'` (seen in `WorkflowMarketplace.tsx:25`, `AssistantDetailsProfile.tsx:60`, and required by the ticket for `StatusLabel.tsx`) rather than the `pluralize()` helper already defined in `helpers.ts:267-284` (which is used elsewhere but not for this "total uses" text).
- Tooltip convention: PrimeReact `Tooltip` component (wrapped via `@/components/Tooltip`) is mounted once per parent with a CSS-class target selector, and every element that should show a tooltip on hover carries `data-pr-tooltip="<text>"` plus the shared target class (pattern repeated in `Card.tsx`, `AssistantCard.tsx`, `AssistantDetailsProfile.tsx`, `WorkflowCard.tsx`).
- Leaf presentational components in this feature area (`StatusLabel`, `WorkflowMarketplace`) are wrapped in `React.memo` and take the whole entity object as a prop rather than pre-extracted primitives (`StatusLabel` takes `assistant: Assistant`).
- `Button.tsx` styling is driven by a `cn()`/`classNames`-style merge (`@/utils/utils`'s `cn`) where a later `className` argument can override earlier Tailwind classes — this is the mechanism the ticket relies on to shrink the tertiary buttons.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/components/component-patterns.md` and `.ai-run/guides/components/component-organization.md` exist but contain no explicit mention of `Tooltip` or `data-pr-tooltip` usage patterns — the tooltip convention above was derived from code, not from these guides.
- `.ai-run/guides/testing/testing-patterns.md` documents the general test structure (Arrange/Act/Assert, `vi.mock()` at module level, `render`/`screen`/`fireEvent` from React Testing Library) that both `StatusLabel.test.tsx` and `AssistantCard.test.tsx` already follow.
- `.ai-run/guides/styling/styling-guide.md` was not read in full for this analysis; Tailwind's stock spacing scale (`gap-1` = 0.25rem = 4px, `gap-3` = 0.75rem = 12px) is used unmodified in this repo's `tailwind.config.ts` — no custom gap scale override was found for these two utility classes.

### Architectural Decisions

- No ADR or inline `DECISION:`/`ADR:` marker was found near `StatusLabel.tsx`, `AssistantCard.tsx`, or `helpers.ts`. No `NOTE:`/`HACK:` comments were found in these three files.

### Derived Conventions

- New formatting helpers belong beside existing ones in `src/utils/helpers.ts`, exported individually (no default export, no class).
- New/changed visible-and-tooltip text pairs follow the existing `data-pr-tooltip` + shared `Tooltip` mount pattern rather than a native `title` attribute.
- Test files for a component mock only the modules that would otherwise pull in unrelated app state (stores, router, feature flags) — `AssistantCard.test.tsx` already mocks `@/utils/helpers` with an inlined reimplementation of `formatCompactCount`; adding `formatMetricCount`/`formatExactCount` calls inside `AssistantCard.tsx` (indirectly via `StatusLabel`) does not require changing this mock unless `StatusLabel` itself is mocked, which it currently is not.

---

## 4. Testing Landscape

### Existing Coverage

- `src/utils/__tests__/helpers.test.ts:26-47` — full coverage of `formatCompactCount` (compact notation, small numbers, numeric strings, null/undefined/NaN defaulting). No tests yet exist for `formatMetricCount` or `formatExactCount` (not yet implemented).
- `src/pages/assistants/components/AssistantList/AssistantCard/__tests__/StatusLabel.test.tsx` — covers all four `StatusType` branches, icon presence, `aria-label`, and two assertions that will need to change under this ticket: `expect(statusElement).toHaveClass('gap-3')` (line 111, must become `gap-1`) and the global-status content assertion `'42 total uses'` (lines 39, 93 — currently asserts the *unformatted* small-number text, which for `42` stays correct under the new spec since 42 < 1000, but the assertion text itself, plus a tooltip assertion, will need extending per Implementation Detail 4).
- `src/pages/assistants/components/AssistantList/AssistantCard/__tests__/AssistantCard.test.tsx` — mocks `formatCompactCount` inline (lowercase compact) for reaction-counter assertions (`12k`, `68k`, `54k` at lines 227-229) and separately asserts `chatButton` has class `shrink-0` (line 233). No existing test asserts the tertiary buttons' width/padding classes (`min-w-0`, `px-1.5`) — this is new coverage the ticket requires.
- No existing test in either file exercises `unique_users_count` values >= 1000 for the global-status label, nor any tooltip text on `StatusLabel`.

### Testing Framework and Patterns

- Vitest (`vitest.workspace.ts` defines two projects, `unit` and `integration`) with React Testing Library (`@testing-library/react`, `fireEvent`, `screen`, `render`). Both target files under test here run in the `unit` project (no `.integration.test.tsx` suffix).
- Module-level `vi.mock()` calls are used for store/router/hook dependencies in `AssistantCard.test.tsx`; `StatusLabel.test.tsx` uses no mocks at all (renders the real component with a hand-built `Assistant` mock object).

### Coverage Gaps

- No test exists today for large `unique_users_count` values (>= 1000) rendered through `StatusLabel` — this is the exact scenario the ticket exists to fix, and currently entirely unverified.
- No test exists for a hover tooltip on the `StatusLabel` status element (no `data-pr-tooltip` assertion, no `Tooltip` mock in `StatusLabel.test.tsx`).
- No test exists asserting the tertiary reaction buttons' shrink-related classes (`min-w-0`, `px-1.5`) in `AssistantCard.test.tsx`.
- `formatMetricCount` and `formatExactCount` have zero test coverage since they do not yet exist.

---

## 5. Configuration and Environment

### Environment Variables

- No environment variable, feature flag, or `import.meta.env`/`window._env_` reference was found in `StatusLabel.tsx`, `AssistantCard.tsx`, or the relevant section of `helpers.ts`. Feature flags in this feature area are limited to `useFavoritesEnabled`/`usePinnedAssistantsEnabled` (from `@/hooks/useFeatureFlags`), which gate unrelated pin/favorite UI, not the usage-metric formatting.

### Configuration Files

- No config file governs number-formatting locale or thresholds; the `'en-US'` locale is hardcoded inline at each `Intl.NumberFormat` call site (existing `formatCompactCount`), and the ticket's new helpers follow the same inline-locale convention.

### Feature Flags and Deployment Concerns

- None found specific to this usage-metric display. The ticket references a local Postgres DB seed value (`unique_users_count = 22432` for assistant `bcc7b39e-be3e-4081-bc38-8667d391d241`) for manual verification — this is a data-seeding/test-fixture concern, not an application config concern; no seed script or fixture file matching this UUID was searched for since it is backend-side test data, outside this frontend repository's `src/`.

---

## 6. Risk Indicators

- Speculative: The three tertiary `Button` usages in `AssistantCard.tsx` (Like, Dislike, Clone) will need an explicit `className` combining `min-w-0` and `px-1.5` to defeat `Button.tsx`'s default `min-w-14`, since each button renders icon + text span and so is never treated as `isIconOnly` by `useIsIconOnly` — a `className` that fails to appear *after* the base classes in the `cn()` merge order, or that omits `min-w-0`, would silently leave `min-w-14` in effect and the clipping bug would persist despite the StatusLabel-side fix.
- Speculative: Wiring a hover tooltip onto `StatusLabel.tsx`'s status `<div>` requires either mounting a new `Tooltip` instance scoped to a class unique to that div, or reusing an ancestor's existing `Tooltip` target selector — `Card.tsx`'s own `Tooltip` target (`'.' + tooltipClass` built from the assistant `id`) does not currently include any class from inside `StatusLabel`, so a naive `data-pr-tooltip` addition without a matching `Tooltip`-mount/target class would render no tooltip at all.
- `StatusLabel.test.tsx` line 111 currently hard-asserts `gap-3` on every status type (not just GLOBAL) — changing only the GLOBAL branch's gap (if the fix is scoped narrowly) versus changing the shared container class (if the fix touches the whole component) has different test-update implications; the ticket's Implementation Detail 2 says "update container class to gap-1" without scoping it to GLOBAL only, so the SHARED/OWNED/NOT_SHARED branches would also move from 12px to 4px icon-text gap unless deliberately excluded.
- Two other locations in the codebase render the same "unformatted count + total uses" pattern the ticket is fixing (`AssistantDetailsProfile.tsx` for the assistant detail page, `WorkflowMarketplace.tsx` for workflow cards) and neither is named in the ticket's implementation details — after this fix ships, the Assistants Marketplace card will show `22.4K uses` while the Assistant Details page continues to show `22k total uses` for the same underlying number, a visible formatting inconsistency across pages that a reviewer may flag.
- `formatCompactCount` must remain byte-for-byte unchanged (lowercase `k`/`m`, no `maximumFractionDigits` cap) because `helpers.test.ts:26-47` and `AssistantCard.test.tsx`'s inline mock both assert its exact current lowercase output for the reaction counters — any refactor that tries to share logic between `formatCompactCount` and the new `formatMetricCount` risks breaking one of these two suites if not kept strictly separate.
- No existing helper handles thousands-separator formatting (`toLocaleString`) anywhere in `helpers.ts` today — `formatExactCount` is a genuinely new formatting primitive for this codebase, not a variant of an existing one.

---

## 7. Summary for Complexity Assessment

This change touches three layers: the utility layer (`src/utils/helpers.ts`, two new pure formatting functions), a presentational leaf component (`StatusLabel.tsx`, its text, gap class, and a new hover tooltip), and a sibling composing component (`AssistantCard.tsx`, three `Button` usages needing width/padding overrides). All target files and functions are named explicitly in the ticket, all exist today and were read in full, and none require new architectural layers, new dependencies, new API calls, or data-model changes — this is a display-formatting and layout-spacing fix confined to already-identified files.

Technical novelty is low-to-moderate: `Intl.NumberFormat` with `notation: 'compact'` is already used in this exact codebase (`formatCompactCount`), so `formatMetricCount` is a parameterization of a proven pattern (adding `maximumFractionDigits: 1` and skipping the lowercase transform); `toLocaleString('en-US')` for `formatExactCount` is new to this codebase but is a single-line native API call. The main non-trivial piece is the tooltip wiring on `StatusLabel.tsx`, since no `Tooltip` instance is currently mounted near that component and the existing target-selector convention (class-based, mounted by an ancestor) means the implementer must either add a new `Tooltip` mount inside/near `StatusLabel` or extend an ancestor's target selector — this is a real design decision, not just a text change, and is the most likely source of an incorrect first attempt (tooltip attribute present but never rendered).

Test coverage for the exact scenario being fixed (large `unique_users_count` values, tooltip text, shrink classes on tertiary buttons) is currently zero, so the ticket's own required test updates constitute new coverage rather than adjustments to existing assertions in most cases — except for two pre-existing hard assertions (`StatusLabel.test.tsx`'s `gap-3` class check and `AssistantCard.test.tsx`'s lowercase-compact reaction-counter mock) that must be deliberately preserved-or-updated rather than incidentally broken. A secondary risk worth surfacing to the requester (not part of the fix) is that the identical clipping bug and formatting inconsistency exists in `AssistantDetailsProfile.tsx` and `WorkflowMarketplace.tsx`, neither of which this ticket's scope touches.

---

## 8. External References

None named by the task. The task's "Implementation Details" section names four specific in-repository files and their required changes; these are the subject of the fix itself, not an external source of truth pointed to by the requester, and were researched directly in Section 2 rather than reported here.
