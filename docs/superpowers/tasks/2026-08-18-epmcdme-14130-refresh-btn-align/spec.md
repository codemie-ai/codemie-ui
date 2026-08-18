# EPMCDME-14130: Fix Refresh Button Alignment in IntegrationSection

## Problem

`IntegrationSection` places `IntegrationSelector` and a Refresh button side-by-side in a `flex items-end gap-2` row. The Refresh button uses `className="!h-8 shrink-0"` to reach 32 px (matching the PrimeReact Dropdown trigger height).

`IntegrationSelectDropdown` inside `IntegrationSelector` has two render paths:

| Path | Left column height | `items-end` behaviour |
|---|---|---|
| SELECT (has integrations) | 56 px (label 16 + gap 8 + dropdown 32) | Refresh button bottom-aligns with dropdown — **correct** |
| ADD BUTTON (`isRequired=false`, no integrations) | 28 px (`ButtonSize.MEDIUM` = `h-7`, no label) | 32 px Refresh button is 4 px taller — Add button pushed down 4 px — **broken** |

The ADD BUTTON path is only reachable today via `IndexTypeGit` (`isRequired={false}`) when no Git integrations are configured.

A secondary issue: the `!h-8` override (`height: 2rem !important`) was added as a workaround because `tailwind-merge` v3 does not recognise `!h-8` as conflicting with `h-7`. A plain `h-8` is correctly resolved by `tailwind-merge` v3 and removes the `!important` antipattern.

## Fix

Two changes in `IntegrationSection.tsx`, no other files:

1. **Refresh button:** change `className="!h-8 shrink-0"` → `className="h-8 shrink-0"`.  
   `Button.tsx` calls `cn(... 'h-7' ..., className)`. `tailwind-merge` v3 resolves `h-7 h-8` → `h-8`. Button is 32 px without `!important`.

2. **IntegrationSelector call:** add `buttonClassName="h-8"`.  
   Forwarded via `IntegrationSelector` → `IntegrationSelectDropdown` → `Button className`. `tailwind-merge` v3 resolves `h-7 h-8` → `h-8`. "Add User Integration" button becomes 32 px.

## Acceptance Criteria

- Git datasource form with no integrations configured: "Add User Integration" button and Refresh button are the same height and top-aligned.
- Any datasource form with integrations configured (dropdown path): Refresh button continues to align with the dropdown trigger.
- No regressions in other datasource types (Confluence, Jira, SharePoint, etc.) — all use `isRequired=true` so the ADD BUTTON path is not reached.
