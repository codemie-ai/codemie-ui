# Fix Transform Mapping Row Icon Layout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the chevron icon and delete button from being compressed when the MappingRow output_field name is long, ensuring proper text wrapping and icon alignment.

**Architecture:** Pure CSS/Tailwind fix in a single component. The flex header row needs `shrink-0` on fixed-size elements, `min-w-0` on the text container to allow shrinking below content width, and `items-start` for proper multi-line alignment.

**Tech Stack:** React, Tailwind CSS, `cn()` utility

## Global Constraints

- Tailwind-only styling — no custom CSS or inline styles
- Semantic theme tokens only — no raw palette values
- `cn()` for all conditional class merging

---

### Task 1: Fix flex overflow behavior in MappingRow header

**Files:**
- Modify: `src/pages/workflows/editor/configPanels/components/MappingRow.tsx:349-378`

**Interfaces:**
- Consumes: `mapping.output_field` (string, can be arbitrarily long)
- Produces: Visual layout that never compresses icons regardless of text length

Test-first: no — CSS-only layout fix, not testable via RTL (no behavioral change)

- [ ] **Step 1: Add `shrink-0` to ChevronUpSvg**

Prevents the chevron icon from being compressed by flex layout when text is long.

```tsx
<ChevronUpSvg
  className={cn('w-4 h-4 mt-0.5 shrink-0 text-text-quaternary transition-transform', {
    'transform rotate-180': !isExpanded,
  })}
/>
```

- [ ] **Step 2: Add `min-w-0 break-words` to text span**

`min-w-0` overrides the flex item's default `min-width: auto`, allowing it to shrink below its content width. `break-words` enables word-wrap for very long unbroken strings.

```tsx
<span className="text-sm font-medium text-text-primary flex-1 min-w-0 break-words">
  {mapping.output_field || `Mapping #${index + 1}`}{' '}
  <span className="text-xs text-text-quaternary inline-block">
    ({MAPPING_TYPE_OPTIONS.find((o) => o.value === mapping.type)?.label ?? mapping.type})
  </span>
</span>
```

- [ ] **Step 3: Add `shrink-0` to delete Button**

Prevents the delete button from being compressed.

```tsx
<Button
  type={ButtonType.DELETE}
  size={ButtonSize.SMALL}
  className="mt-0.5 shrink-0"
  onClick={(e) => {
    e.stopPropagation()
    handleDelete()
  }}
  aria-label="Delete mapping"
>
  <DeleteSvg className="w-4 h-4" />
</Button>
```

- [ ] **Step 4: Change `items-center` to `items-start` on header container**

When text wraps to multiple lines, `items-start` keeps icons anchored to the first line instead of floating to the vertical center. Add `mt-0.5` (2px) to chevron and button to optically align them with the text baseline (text-sm = 20px line-height, icon = 16px).

```tsx
<div // nosonar
  className="flex items-start gap-2 p-3 bg-surface-base-chat cursor-pointer hover:bg-surface-elevated"
  onClick={onToggle}
>
```

- [ ] **Step 5: Change type label from `ml-2` to `inline-block`**

Replace `ml-2` margin with natural text spacing (`{' '}` before the span). Use `inline-block` to prevent the type label from being split mid-word across lines.

- [ ] **Step 6: Verify typecheck passes**

Run: `npm run typecheck`
Expected: Zero errors

- [ ] **Step 7: Verify lint passes**

Run: `npx eslint src/pages/workflows/editor/configPanels/components/MappingRow.tsx`
Expected: No warnings or errors

- [ ] **Step 8: Visual verification**

Start dev server (`npm run dev`), navigate to a workflow with a Transform node, add a mapping with a very long output field name (50+ characters). Verify:
1. Chevron icon stays at 16px, never compressed
2. Delete button stays at full size, never compressed
3. Long text wraps cleanly within the row
4. Icons align with the first line of text
5. Single-line field names look identical to before

- [ ] **Step 9: Commit**

```bash
git add src/pages/workflows/editor/configPanels/components/MappingRow.tsx
git commit -m "EPMCDME-13930: Fix transform mapping row icon layout for long field names"
```

---

## Implementation Status

**All steps are already implemented** across two commits:
- `789c0a0e7` — Steps 1-3, 5-7, 9 (core flex overflow fix)
- `aa6466def` — Step 4 (items-start alignment improvement)

**Remaining:** Step 8 (visual verification) should be performed during code review/validation stages.
