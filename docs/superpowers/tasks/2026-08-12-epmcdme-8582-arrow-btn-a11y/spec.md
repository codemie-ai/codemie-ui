# Spec: EPMCDME-8582 — Arrow Button Keyboard Accessibility

## Problem

Arrow/chevron SVG elements used as interactive controls are not keyboard-accessible across multiple pages. Keyboard users cannot Tab to or activate these controls; screen readers cannot announce them.

Four components confirmed defective:

| Component | Defect | Severity |
|---|---|---|
| `ChatHistoryControls.tsx` | Raw `<ChevronLeftSvg onClick>` / `<ChevronRightSvg onClick>` — no `<button>` wrapper, no `tabIndex`, no `aria-label` | High — affects every chat page with multi-variant messages |
| `MappingRow.tsx` | `<div onClick={onToggle}>` as expand/collapse trigger — not focusable | Medium — workflow editor only |
| `ConfigPanel.tsx` | `<Button>` has no `onClick`; relies on parent `<div onClick>` via bubbling — keyboard activation does nothing | Medium — workflow editor only |
| `ConfigSection.tsx` | `<button>` exists but missing `type="button"`, `aria-expanded`, `aria-label` | Low — settings/admin only |

## Approach

Full sweep — fix all four components in a single branch. All fixes follow the established pattern from prior commits (EPMCDME-8417, EPMCDME-8460):

- Wrap icon-only interactive SVGs in `<button type="button" aria-label="...">` with `<ChevronXSvg aria-hidden="true" />` inside
- Add `aria-expanded` on toggle buttons
- Never place `onClick` on a raw SVG or plain `<div>`
- Use native `disabled` attribute on boundary-state buttons (replaces `pointer-events-none` class)

No new packages. No state, API, or routing changes. Presentational layer only.

## Component Fixes

### 1. ChatHistoryControls.tsx

Replace both raw SVG elements with `<button type="button">` wrappers:

```tsx
<div className="flex items-center ml-auto select-none text-xs text-text-quaternary">
  <button
    type="button"
    aria-label="Previous version"
    disabled={isFirstIndex}
    onClick={setPrevIndex}
    className="mr-2"
  >
    <ChevronLeftSvg aria-hidden="true" className="w-3 hover:opacity-100" />
  </button>
  {messageIndex + 1} / {totalMessages}
  <button
    type="button"
    aria-label="Next version"
    disabled={isLastIndex}
    onClick={setNextIndex}
    className="ml-2"
  >
    <ChevronRightSvg aria-hidden="true" className="w-3 hover:opacity-100" />
  </button>
</div>
```

`disabled` replaces `pointer-events-none opacity-25` — semantically correct and announced by screen readers.

### 2. MappingRow.tsx

Split the `<div onClick>` header into an outer layout container (keeps hover, spacing) and an inner `<button>` (toggle only). The Delete button stays separate — interactive elements cannot nest inside `<button>`.

```tsx
{/* outer div: keeps gap-2, p-3, hover — no onClick */}
<div className="flex items-center gap-2 p-3 bg-surface-base-chat hover:bg-surface-elevated">
  <button
    type="button"
    aria-expanded={isExpanded}
    aria-label={`Toggle ${mapping.output_field || `Mapping #${index + 1}`}`}
    onClick={onToggle}
    className="flex items-center gap-2 flex-1 cursor-pointer text-left bg-transparent p-0 border-0 min-w-0"
  >
    <ChevronUpSvg
      aria-hidden="true"
      className={cn('w-4 h-4 text-text-quaternary transition-transform shrink-0', {
        'transform rotate-180': !isExpanded,
      })}
    />
    <span className="text-sm font-medium text-text-primary flex-1 min-w-0">
      {mapping.output_field || `Mapping #${index + 1}`}
      <span className="ml-2 text-xs text-text-quaternary">
        ({MAPPING_TYPE_OPTIONS.find((o) => o.value === mapping.type)?.label ?? mapping.type})
      </span>
    </span>
  </button>
  <Button
    type={ButtonType.DELETE}
    size={ButtonSize.SMALL}
    onClick={(e) => { e.stopPropagation(); handleDelete() }}
    aria-label="Delete mapping"
  >
    <DeleteSvg className="w-4 h-4" />
  </Button>
</div>
```

`bg-transparent p-0 border-0` strips browser button defaults. Full-row hover is preserved on the outer `<div>`. Visual result identical to current.

### 3. ConfigPanel.tsx

Add `onClick={toggleCollapsed}` and `aria-expanded={!isCollapsed}` to the existing `<Button>`. The `aria-label` is already correct. The parent `<div onClick={toggleCollapsed}>` stays — it provides the broad mouse click target.

```tsx
<Button
  type={ButtonType.TERTIARY}
  aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
  aria-expanded={!isCollapsed}
  onClick={toggleCollapsed}
  className="opacity-75"
>
  <ChevronRightIconSvg aria-hidden="true" className={cn('w-4 h-4 transition-transform', {
    'rotate-90': !isCollapsed,
  })} />
</Button>
```

Two-line addition. No structural or visual change.

### 4. ConfigSection.tsx

Add `type="button"`, `aria-expanded`, and `aria-label` to the existing `<button>`. Add `aria-hidden="true"` to `ChevronDownSvg`.

```tsx
<button
  type="button"
  aria-expanded={isExpanded}
  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title}`}
  onClick={() => setIsExpanded(!isExpanded)}
  className="flex items-center gap-2 flex-1 text-left group transition hover:opacity-85"
>
  {icon && <span className="text-xl">{icon}</span>}
  <h3 className="font-bold text-text-quaternary">{title}</h3>
  <ChevronDownSvg
    aria-hidden="true"
    className={cn(
      'w-4 h-4 text-text-quaternary transition-transform ml-2 group-hover:opacity-85',
      isExpanded ? 'rotate-180' : ''
    )}
  />
</button>
```

No structural or visual change.

## Testing

Each component gets a new test file in its co-located `__tests__/` directory. Test template: `SidebarToggle.test.tsx` (vitest + @testing-library/react).

SVG mock pattern:
```ts
vi.mock('@/assets/icons/chevron-left.svg?react', () => ({
  default: (props: any) => <svg data-testid="chevron-left-icon" {...props} />,
}))
```

Assertions per component:

| Component | Key assertions |
|---|---|
| ChatHistoryControls | `getByRole('button', { name: /previous version/i })`, `toHaveAttribute('disabled')` at first index, `not.toHaveAttribute('disabled')` otherwise, click calls `onChangeMessageIndex` |
| MappingRow | `getByRole('button', { name: /toggle/i })`, `toHaveAttribute('aria-expanded', 'true'/'false')`, click calls `onToggle`, delete click calls `onDelete` without calling `onToggle` |
| ConfigPanel | `getByRole('button', { name: /collapse panel/i })`, `toHaveAttribute('aria-expanded', 'false')` when collapsed, click calls `toggleCollapsed` |
| ConfigSection | `getByRole('button', { name: /expand .*/i })`, `toHaveAttribute('aria-expanded', 'false')`, click toggles `aria-expanded` |

## Acceptance Criteria

- All four arrow/chevron interactive controls receive Tab focus
- Screen readers announce button role, accessible name, and (where applicable) expanded state
- `disabled` buttons are announced as disabled by screen readers
- No visual regression — layout, spacing, hover effects, and icon appearance are unchanged
- All new tests pass
