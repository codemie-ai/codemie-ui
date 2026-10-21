# Spec — EPMCDME-16055: Models table row inconsistency

## Problem

`ModelConfigurationTable` (`src/pages/settings/administration/projectsManagement/components/ModelConfigurationTable.tsx`)
renders rows with inconsistent height, and provider text can overlap the capability tags.

Root causes (see `technical-analysis.md`):

1. The capabilities cell stacks tags **vertically** (`flex flex-col`), so a row with 2 tags
   (`multimodal` + `tools`) is two lines tall while a row with 0–1 tags is one line tall.
2. The provider cell forces single-line text (`whitespace-nowrap`) with no truncation, so a long
   provider label (e.g. "Vertex Ai-anthropic Models") overflows its 16%-wide column and visually
   bleeds into the Capabilities column.

There is an uncommitted, unreviewed edit already on this branch (`h-12` on `<tr>`, dropped
`whitespace-nowrap` on provider, `flex-wrap` on capabilities). It is **not** the agreed fix — it
only sets a height floor, not a cap, and reintroduces wrapping risk on both the provider and
capabilities cells at narrow widths. This spec supersedes it; the implementer should treat it as
scratch work and must not assume it's correct.

## Decision: single-line rows, truncate don't wrap

All row content must render on exactly one line. No cell is allowed to wrap, so there is no path
to a taller row regardless of viewport width, tag count, or label length.

Concretely, in `ModelConfigurationTable.tsx`:

1. **Row**: give `<tr>` a fixed height via a single-line-guaranteeing class (e.g. `h-12` is fine
   *once no cell can wrap* — at that point it's an exact height, not just a floor). Do not rely on
   `h-12` alone without the truncation changes below.

2. **Model cell**: remove `break-words`; replace with `truncate` (or `line-clamp-1`) on the label
   span so a long model name clips with ellipsis instead of wrapping. The cell/span needs
   `min-w-0`/`overflow-hidden` for truncation to take effect inside the flex/table layout. The
   "Premium" `StatusBadge` must stay on the same line and not be pushed out — give the label span
   `flex-1 truncate` and keep the badge as a non-shrinking sibling.

3. **Provider cell**: keep `whitespace-nowrap` (or move to `truncate`, which implies nowrap) but
   add `overflow-hidden truncate` so an oversized label clips inside its column instead of
   overflowing into Capabilities. This fixes AC4 without allowing wrap-driven height growth.

4. **Capabilities cell**: change the tag container from `flex flex-col` to `flex flex-nowrap
   items-center gap-1` (nowrap, not `flex-wrap` — wrap is still a wrapping path at narrow widths
   and must not be used). Tags themselves already have `whitespace-nowrap`, so with `flex-nowrap`
   on the container the two pills always sit side by side on one line. If the Capabilities column
   width (currently 14%) is too narrow for `multimodal` + `tools` to fit side by side at the
   narrowest supported layout, widen that column (adjust the `colgroup` percentages, e.g. take a
   few points from the Cost column, which has the most slack at 35%) rather than allowing wrap.

5. Re-verify the `colgroup` widths against the new single-line rule: Model/Provider truncate so
   their width no longer needs to flex for content; Capabilities needs enough width for two pills.
   Adjust percentages only if needed to satisfy #4 — don't change them speculatively.

## Acceptance Criteria (from ticket)

1. Given the user opens Project details → Models, when the table is displayed, then all rows have
   the same size.
2. Given models with different numbers of capability tags, when displayed, then row size does not
   depend on the number of tags.
3. Given the table is displayed, when scrolled, then no row is visibly wider or narrower than the
   others.
4. Given a row with two capability tags, when displayed, then the model name and provider text do
   not overlap the tags.

## Verification

`ModelConfigurationTable` is rendered from two call sites with different widths — both must be
checked, not just one:

- `ProjectModelsSection.tsx:292` — inline section on the Project details page (full page width).
- `ProjectMemberModelOverrideModal.tsx:302` — inside a `Popup` (`isFullWidth`), narrower than the
  page.

Check in both:
- A row with 2 tags (`multimodal` + `tools`) is the same height as a row with 0 or 1 tags.
- A model with a long label and/or a long provider label (e.g. "Vertex Ai-anthropic Models")
  truncates instead of wrapping or overflowing, and does not touch/overlap the Capabilities
  column.
- Resize/shrink the popup width (if feasible in the test harness) and confirm no row grows taller
  than the fixed row height — this is the scenario the existing `flex-wrap` edit does not cover.

## Out of scope

- No change to `ModelOption`/`getCapabilities`/`getProviderLabel` data shape or logic — this is a
  layout-only fix.
- No new automated test is required by the ticket, but if the implementer adds one, it should
  assert on rendered row height/line count (there's currently no such test — only pure-function
  unit tests for `formatModelCost`/`getProviderLabel`/`getCapabilities` exist in
  `__tests__/ModelConfigurationTable.test.ts`).
