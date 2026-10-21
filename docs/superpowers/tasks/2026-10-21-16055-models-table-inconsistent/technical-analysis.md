# Technical Analysis — EPMCDME-16055 Models table row inconsistency

## File
`src/pages/settings/administration/projectsManagement/components/ModelConfigurationTable.tsx`

Rendered from two call sites, both pass the full model list, no prop controls layout:
- `ProjectModelsSection.tsx:292` — inline section on the Project details page.
- `ProjectMemberModelOverrideModal.tsx:302` — inside a `Popup` (`isFullWidth`).

`colgroup` widths (table-fixed): checkbox 4%, Model 31%, Provider 16%, Capabilities 14%, Cost 35%.

## Root cause (HEAD / committed code, before the uncommitted edit)

1. **Row height varies with capability count (AC1/AC2).**
   The `<tr>` has no height constraint (`className={cn(model.isPremium && 'bg-yellow-500/5', 'text-sm')}`).
   The capabilities cell renders tags with `flex flex-col items-start gap-1` — i.e. tags are
   stacked **vertically**. A row with 2 tags (`multimodal` + `tools`) is therefore two lines
   tall; a row with 1 tag or none is one line tall. This directly produces the "some rows taller"
   symptom.

2. **Provider text overlaps the capability tags (AC4).**
   The provider `<td>` uses `whitespace-nowrap` (`className="whitespace-nowrap px-4 py-3 text-text-quaternary"`),
   forcing the provider label onto a single line regardless of the 16%-wide column. Because the
   cell has no `overflow-hidden`/`truncate`, a long label such as `"Vertex Ai-anthropic Models"`
   is wider than the column and visually bleeds into the neighboring Capabilities column, where
   it overlaps the tags.

## Pre-existing uncommitted edit on this branch (unreviewed, not ground truth)

`git diff` on this file shows three changes already applied in the working tree:

```diff
- className={cn(model.isPremium && 'bg-yellow-500/5', 'text-sm')}
+ className={cn(model.isPremium && 'bg-yellow-500/5', 'text-sm h-12')}

- <td className="whitespace-nowrap px-4 py-3 text-text-quaternary">
+ <td className="px-4 py-3 text-text-quaternary">

- <div className="flex flex-col items-start gap-1">
+ <div className="flex flex-wrap items-center gap-1">
```

This is plausible prior art for the fix (it attacks the same three spots the bug report names),
but it has two unverified risks that should be checked/fixed before trusting it, not assumed
correct:

- **`h-12` on `<tr>` behaves as a minimum, not a cap.** In table layout, `height` on a table row
  is a floor — if any cell's content needs more than 48px the row still grows. Two paths can
  still make a row taller than its neighbors even with this patch applied:
  - The Model cell keeps `break-words` with no line-clamp; a long model label can wrap to 2+
    lines.
  - The Capabilities column is only 14% wide. With `flex-wrap` (not `flex-nowrap`), two pills
    (`multimodal` + `tools`) can still wrap onto two lines at narrower table widths, reproducing
    the exact AC1/AC2 symptom the patch is meant to fix, just at a different breakpoint.
  - The Provider cell no longer has `whitespace-nowrap`, so long provider labels (e.g. the
    `"Vertex Ai-anthropic Models"` example in the ticket) can now wrap to 2 lines instead of
    overflowing — this likely fixes AC4, but can grow the row height for provider-heavy rows,
    which `h-12` won't prevent.
  A more robust fix would combine a true fixed/min height with content that is guaranteed to fit
  on one line (e.g. `truncate` on Model/Provider text, `flex-nowrap` + possibly smaller gap on
  Capabilities, or widening the Provider/Capabilities columns), rather than relying on `h-12`
  alone once wrapping is allowed back in.

- **No layout/row-height test exists.** `__tests__/ModelConfigurationTable.test.ts` only unit-tests
  `formatModelCost`, `getProviderLabel`, `getCapabilities` (pure helpers) — nothing renders the
  table or asserts row height/line count, so neither the original bug nor the candidate fix is
  covered by an automated test today.

## Other call-site consideration

Both consumers render the table at different widths (plain section vs. popup `isFullWidth`), so
any width-dependent wrapping behavior (capabilities wrapping, provider wrapping) should be
checked in both contexts, not just one.
