# Technical Analysis: Sidebar Toggle Tooltip (EPMCDME-12771)

## Codebase Findings

### Core Component: SidebarToggle.tsx
- **Location**: `src/components/Sidebar/SidebarToggle.tsx`
- **Button element**: Lines 58–76
  - Type: `"button"`
  - Current aria-label: `"Hide Sidebar"` (when open) / `"Open Sidebar"` (when closed)
  - OnClick handler: calls `toggle()` → `appInfoStore.toggleSidebar()`
  - Icon: `ChevronLeftSvg` with `aria-hidden="true"` (icon hidden from screen readers since button label covers purpose)
  - Styling: PrimeReact `classNames` with Tailwind (bg-surface-base-primary-border, hover effect, transitions)

### Keybinding: Ctrl+B Already Implemented
- **Location**: Same file (`SidebarToggle.tsx`)
- **Handler**: Keyboard listener for `Ctrl+B` (or `Cmd+B` on Mac)
- **Action**: Calls `appInfoStore.toggleSidebar()`
- **Status**: Fully functional; user can already toggle sidebar via keyboard

### Global Tooltip Pattern (React Tooltip)
- **Setup file**: `src/utils/tooltip.ts`
- **Initialization**: Called in `src/main.tsx` during app startup
- **Library**: `react-tooltip` (v5 or later)
- **Config**: `openEvents: { mouseover: true }` — triggers on hover
- **Container**: HTML element with id `"react-tooltip-container"` (rendered in main.tsx)
- **Global instance**: Single `<Tooltip id="react-tooltip">` component with custom styling
  - Dark theme
  - Max-width: 500px
  - Whitespace: pre-line (preserves line breaks)
  - Z-index: z-10000 (high stacking order)

### Data-Attribute Usage Pattern
Used across 30+ files; consistent pattern:
```jsx
<button
  data-tooltip-id="react-tooltip"
  data-tooltip-content="Text to display"
>
  Button Label
</button>
```

**Examples in codebase**:
- `ChatHeaderClearButton.tsx` (line 39–40): "Clear Chat" tooltip
- `ChatHeaderBrowseFilesButton.tsx`: "Browse Files" tooltip
- `ChatHeaderShareButton.tsx`: "Share Chat" tooltip
- `CategoriesManagementPage.tsx`, `ProjectMembersManager.tsx`, `MCPToolkit.tsx`: Multiple tooltip instances

### Button Component Support
- **File**: `src/components/Button/Button.tsx`
- **Pattern**: Uses `...rest` spread operator to pass through HTML attributes
- **Implication**: Data attributes (`data-tooltip-id`, `data-tooltip-content`) automatically supported if SidebarToggle uses this Button component or applies attributes directly to `<button>`

### Accessibility Conventions in Codebase
1. **aria-label**: Describes button purpose (e.g., "Hide Sidebar", "Open Sidebar")
2. **aria-describedby**: Conditionally applied when additional description/tooltip exists
   - Pattern: `aria-describedby={hasDescription ? descriptionId : undefined}`
   - Links to element with matching ID containing description text
3. **useId() hook**: Generates unique IDs for aria-describedby targets
4. **Screen reader considerations**:
   - `aria-hidden="true"` on icons (prevents duplication)
   - Descriptions placed in semantic containers or `role="status"` divs
   - `sr-only` class hides visual content from sighted users but exposes to screen readers

**Examples**:
- `TooltipButton.tsx`: aria-label + aria-expanded + aria-describedby
- `OnboardingTooltip.tsx`: aria-labelledby + aria-describedby with dialog role
- `NavigationAssistants.tsx`: aria-label + conditional aria-describedby

## Risk Indicators

### 1. No Existing Test Coverage
- **Finding**: SidebarToggle.tsx has no test file in `src/components/__tests__/` (centralized test structure)
- **Current pattern**: Tests for components live in `src/components/__tests__/` (not per-component `__tests__` subdirs)
- **Risk**: Medium — component is untested, tooltip addition increases surface without verification
- **Mitigation**: Consider writing `SidebarToggle.test.tsx` in `src/components/__tests__/` for tooltip visibility (hover behavior)

### 2. Wide Component Usage
- **Finding**: `SidebarToggle` embedded in `Sidebar` component, used across multiple pages:
  - Assistants page
  - Applications page
  - Analytics page
  - Settings page
- **Risk**: Medium — regression on any page if toggle behavior or styling changes
- **Mitigation**: Verify tooltip doesn't interfere with button positioning or click detection across all pages

### 3. Accessibility Coordination
- **Finding**: Existing aria-label ("Hide Sidebar"/"Open Sidebar") already covers button purpose
- **Risk**: Low if using data-attribute pattern (no aria-describedby collision)
- **Risk**: High if using aria-describedby pattern (must ensure tooltip content doesn't override or duplicate aria-label for screen readers)
- **Mitigation**: Prefer data-attribute pattern (react-tooltip) over aria-describedby to avoid redundant announcements

### 4. Tooltip Position Constraints
- **Finding**: SidebarToggle button is `absolute left-0 top-[calc(50%-100px)]` with size `w-[24px] h-[128px]`
- **Risk**: Low positioning conflict; tooltip should render on right side (natural for left-side button)
- **Mitigation**: Test tooltip alignment on different viewport widths (mobile, tablet, desktop); verify no cutoff at screen edges

### 5. Icon aria-hidden Already Set
- **Finding**: ChevronLeftSvg has `aria-hidden="true"`
- **Risk**: None — consistent with current accessibility strategy
- **Implication**: Tooltip content will not be announced twice by screen readers

## Implementation Approach

### Recommended Pattern (Data Attribute)
Add to `SidebarToggle.tsx` button element:
```jsx
<button
  data-tooltip-id="react-tooltip"
  data-tooltip-content="Ctrl + B"
  // ... existing attributes
>
```

**Rationale**:
1. Consistent with 30+ existing uses in codebase
2. No aria-describedby coordination needed
3. Leverages existing global tooltip infrastructure (no new setup)
4. Hover-hold behavior already provided by `openEvents: { mouseover: true }` config

### Alternative Pattern (aria-describedby)
If accessibility guidance requires explicit aria-describedby:
1. Generate unique ID for description element: `const descId = useId()`
2. Add `aria-describedby={descId}` to button (only when tooltip visible)
3. Create hidden element: `<span id={descId} className="sr-only">Ctrl + B</span>`

**Trade-off**: More complex, requires state management, but provides explicit semantic link for screen readers.

## Validation Checklist

- [ ] Verify tooltip "Ctrl + B" appears on hover-hold (test with actual mouse/trackpad)
- [ ] Verify tooltip disappears when cursor moves away
- [ ] Test button click still works (no tooltip blocking interaction)
- [ ] Verify tooltip styling matches other UI tooltips (colors, font, padding)
- [ ] Test on mobile/tablet (touch vs. hover behavior)
- [ ] Check accessibility: screen reader announces "Hide Sidebar"/"Open Sidebar" + tooltip content (no duplication)
- [ ] Verify no regression on Assistants, Applications, Analytics, Settings pages where SidebarToggle appears
- [ ] Test tooltip doesn't get cut off at screen edges (especially on mobile)

## Files to Modify

- `src/components/Sidebar/SidebarToggle.tsx`: Add data-tooltip attributes to button element

## Files to Verify (No Changes Expected)

- `src/utils/tooltip.ts`: Confirm existing config
- `src/main.tsx`: Confirm tooltip initialization still works
- `src/components/Button/Button.tsx`: Confirm attribute pass-through (if SidebarToggle uses it)
