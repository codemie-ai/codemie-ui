# Technical Research

**Task**: hosted-applications application-card catalog layout
**Generated**: 2026-11-12
**Research path**: filesystem

---

## 1. Original Context

Ticket text is held in `requirements.local.md` (untrusted requirements). Verbatim summary as supplied:

> Bug EPMCDME-17136 — In the Hosted Applications catalog, on an application card the "Activate version" button overlaps the "Not shared with project" status and its icon; "No active version yet" status sits right next to it; text unreadable. AC: 1) the button and both statuses render on the card without overlapping; 2) all text and icons fully readable; 3) the "Activate version" button remains clickable.

Ticket detail (from `requirements.local.md`): preconditions are an own application (e.g. "test 2", description "Testing") with no active version, not shared with a project. Steps: open Hosted Applications, find that card, look at the card bottom. Expected: button and both statuses placed separately, not overlapping, fully readable. Screenshot attachment was not retrieved (viewport width unknown).

---

## 2. Codebase Findings

### Existing Implementations

**Purpose: lay out the card's bottom row (action button + status labels) so nothing overlaps.**

- `HostedApplicationCard` — `src/pages/applications/hosted/HostedApplicationCard.tsx:114`. Builds the `actions` and `status` props for the shared `Card`. Only consumer: `HostedCatalogResults.tsx:90` (plus its unit test).
  - `actions` (`:172-190`): when `!openable && isManager(app)` a single `Button size="small" variant="secondary"` labelled by `nextStepLabel` (`:57-61`: "Upload version" / "Activate version" / "Manage"), navigating to details; otherwise `OpenButtons` (`:69-112`, icon-only View + Open in new tab). The code comment at `:65-66` states icons were chosen "so the card row keeps room for the status".
  - `status` (`:124-139`): `div.flex flex-row flex-wrap items-center gap-x-4 gap-y-1` holding up to four `StatusItem`s: Marketplace (`is_global`), Shared/Not shared with project (`!is_global && seesSharing`), Suspended, No active version yet (`!openable`, id used as `aria-describedby`).
  - `StatusItem` (`:45-50`): `span.flex items-center gap-3 whitespace-nowrap text-xs` — icon + text, never wraps internally.
- `Card` — `src/components/Card/Card.tsx:44`. Bottom row at `:167-173`:
  `div.flex items-center mt-3 h-7 max-lg:flex-wrap max-lg:h-auto max-lg:gap-y-2 max-lg:[&>*]:h-auto max-sm:mt-2` containing `{actions}` then `div.flex flex-row ml-auto items-center text-xs gap-3` wrapping `{status}`.
  - Rules it applies: at `lg` (Tailwind default 1024px) and above the row has **fixed height `h-7` (28px) and no wrap**; below `lg` it wraps and its height is auto. The status wrapper has no `min-w-0`, no `flex-wrap`, no `overflow` handling. The `Button` (`src/components/Button/Button.tsx:61-65`) is `whitespace-nowrap min-w-14`.
  - Consumers (every `from '@/components/Card'` import): `AssistantCard.tsx:345-346`, `SkillCard.tsx:195-196`, `ApplicationCard.tsx:76` (actions only), `AIKatasContent.tsx:435-436`, `AwsEntityList.tsx:125-126`, `HostedApplicationCard.tsx`. Only the hosted card passes `preview` and only it passes a multi-item status.
- Sibling status renderers: assistant `StatusLabel.tsx:118-130` (single `<output>` `whitespace-nowrap`, one status only) and `SkillStatusLabel`; both render one label, so the Card row was sized for one action group + one status.
- Catalog grid — `HostedCatalogResults.tsx:87`: `grid grid-cols-1 card-grid-2:grid-cols-2 card-grid-3:grid-cols-3` (`tailwind.config.ts:566-568`: 1300px / 1600px). Cards are narrowest just above 1300px and 1600px, where the non-wrapping `lg` rules apply.

Observed geometry (fact, no rendering done): the reported state renders "Activate version" button + "Not shared with project" + "No active version yet" — three nowrap pieces in a 28px-high, non-wrapping row. When their combined min-content exceeds the card's inner width, the inner status div wraps to two lines inside the fixed `h-7` row (overflowing vertically, centered) and/or the row overflows horizontally; either way content draws over neighbours.

### Decisions Already in the Code

- Card bottom row fixed at `h-7` with wrap only `max-lg` — `Card.tsx:165-167`, introduced by EPMCDME-15365 (mobile adaptation). Alternative: wrap at all widths. Reason recorded: comment "On narrow cards the status wraps below the actions" — narrowness assumed only below `lg`.
- Hosted card uses `preview` so the card body is `min-h-card flex-1` instead of fixed `h-card` (`Card.tsx:88,108`, EPMCDME-15659) — the card height can grow; non-preview cards stay at fixed `h-card` (158px).
- Statuses are icon + plain text, nowrap, mirroring assistant/skill cards (`HostedApplicationCard.tsx:44`).
- Open/View rendered as icons specifically to save row space (`:65-66`); the manager next-step button is a text button.

### Task Statements Checked Against the Code

- "Activate version button overlaps Not shared with project status and icon" — holds as a reachable state: a creator (`seesSharing`) manager with selected, runnable version and no active version renders exactly that button plus both statuses (`HostedApplicationCard.tsx:59,127-137,173`); Card row geometry permits overlap at ≥1024px (`Card.tsx:167`). Exact viewport unverified (screenshot not retrieved).
- "No active version yet sits right next to it" — holds: rendered in the same status div with `gap-x-4`.
- AC3 "button remains clickable" — current behaviour: button `onClick` navigates to details; card `onClick` ignores clicks inside `button` (`:168`). Covered by test `HostedApplicationCard.test.tsx:136-150`.

### Consumers of Changed Contracts

- `Card` bottom row (`Card.tsx:167-172`) is shared by six card types listed above; any change there reaches AssistantCard, SkillCard, ApplicationCard, AIKatasContent, AwsEntityList as well. Of these, only the hosted card uses `preview` (variable height); the others sit in a fixed `h-card` (158px) body.
- `HostedApplicationCard` status markup: consumed only by `HostedCatalogResults.tsx:90`; `noVersionId` is referenced by `OpenButtons` `aria-describedby` (`:92`) and asserted in test `:174-180`.

### Architecture and Layers Affected

Presentation only: shared component `src/components/Card/Card.tsx` and/or page component `src/pages/applications/hosted/HostedApplicationCard.tsx`. No store, API, or routing involvement.

### Integration Points

None external. Internal: `hostedAccess.ts` (`canOpen`, `isManager`, `isCreator`, `isSuspended`, `suspensionRefuses`) decides which button/statuses appear; `isProjectMember` from `@/utils/entity`.

### Patterns and Conventions

Tailwind utility classes with `classNames`/`cn`; responsive variants `max-lg:`/`max-sm:` and custom screens `card-grid-2/3`; SVG icons imported `?react`; status items as icon + text, `text-xs`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

`.ai-run/guides/styling/styling-guide.md`, `.ai-run/guides/components/component-patterns.md` (Tailwind/component conventions, per AGENTS.md routing); `.ai-run/guides/testing/local-verification.md` requires browser scenarios with screenshots in the MR `## Verified locally` section.

### Architectural Decisions

No ADR for card layout. Inline comments at `Card.tsx:111,165-166` and `HostedApplicationCard.tsx:44,65-66,121` record the intent.

### Derived Conventions

Layout fixes for narrow widths are expressed with responsive Tailwind variants in `Card.tsx`, not per-consumer overrides.

---

## 4. Testing Landscape

### Existing Coverage

`src/pages/applications/hosted/__tests__/HostedApplicationCard.test.tsx` — labels (sharing, suspended, created-by), next-step button label + navigation, disabled View with description, Open in new tab. `card-actions-settle.integration.test.tsx`, `catalog-covers.integration.test.tsx` cover menu actions and covers. Assistant `StatusLabel.test.tsx` covers its status label.

### Testing Framework and Patterns

Vitest + Testing Library (jsdom), `vi.mock` of stores, `MemoryRouter` wrapper, `make()` factory for `HostedApplication`.

### Coverage Gaps

No test asserts layout/classes of the Card bottom row; jsdom does no layout, so overlap itself is not unit-testable — verification is visual (local-verification guide). No `Card` component test found in `src/components/Card`.

---

## 5. Configuration and Environment

### Environment Variables

None relevant.

### Configuration Files

`tailwind.config.ts:556-568` — `h-card`/`min-h-card` (`var(--card-height, 158px)`), `aspect-card-cover` 2/1, screens `card-grid-2` 1300px, `card-grid-3` 1600px, `view-details-bp` 1200px.

### Feature Flags and Deployment Concerns

Hosted Applications is feature-gated (`useHostedFeatureRedirect.ts`); no deployment concerns.

---

## 6. Risk Indicators

- `Card.tsx:167` is shared by six card types; a change to the bottom row alters assistant, skill, kata, application and AWS cards, which sit in a fixed 158px body (`h-card`) where an extra wrapped line may not fit.
- Overlap appears only at certain widths (≥1024px with narrow grid columns, near 1300px/1600px); the ticket screenshot was not retrieved, so the exact width is unknown.
- Up to four hosted statuses plus a text button can coexist (Marketplace/Shared, Suspended, No active version); a fix verified on the reported pair may still collide with "Suspended".
- Layout is not testable in jsdom; acceptance depends on manual/browser verification with screenshots.
- Speculative: a fix scoped to `HostedApplicationCard` (status layout) leaves other Card consumers untouched; a fix in `Card` needs visual checks across all six consumers.

---

## 7. Summary for Complexity Assessment

The bug is purely presentational. The bottom row of the shared `Card` (`src/components/Card/Card.tsx:167`) is fixed at 28px high and does not wrap at widths ≥1024px; the hosted application card (`HostedApplicationCard.tsx`) is the only consumer that puts a text button and two or more nowrap status items into that row. When the catalog grid columns are narrow, the items overflow and draw over each other. Two files are involved at most, both in the presentation layer, with no state, API or config changes.

Nothing about this is technically novel: the code already uses responsive Tailwind variants (`max-lg:flex-wrap`) for the same row. The `Card` row is shared by six card types, so where the fix goes decides how much of the UI has to be checked by eye. The hosted-card unit tests (`HostedApplicationCard.test.tsx`) cover button labels and clickability (AC3) but not layout. Overlap cannot be asserted in jsdom.

Key risks are regressions in other `Card` consumers if the shared row changes, other status combinations (Suspended) still colliding, and the unknown viewport width from the unretrieved screenshot.

---

## 8. External References

None named by the task (the Jira screenshot attachment was referenced but not retrieved).
