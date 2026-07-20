# Implementation Plan: Add Assistant Name to Header

**Ticket**: EPMCDME-12553  
**Epic**: EPMCDME-13292  
**Date**: 2026-07-10  
**Status**: Planning

---

## Requirements

Add the assistant name to the sticky top header in **Assistant Details** and **Edit Assistant** views. Currently, headers display only generic text ("Assistant Details" or "Edit Assistant") without the assistant name. When scrolling to system instructions or additional settings, the name becomes invisible, leaving unclear which assistant the user is working with.

The solution must:
- Display the assistant name below the generic label in the fixed header
- Work correctly on both details and edit views
- Show the name during scroll (header is already sticky by layout)
- Handle loading state gracefully
- Truncate long names to prevent layout overflow
- Not regress existing functionality or tests

---

## Implementation Tasks

### Task 1: Extend PageLayout component with subtitle prop

**File**: `src/components/Layouts/Layout/PageLayout.tsx`

**Description**: Add an optional `subtitle?: string` prop to the `LayoutProps` interface and render it as a second, smaller text line in the header below the title. This prop follows the existing pattern used in `Card` and `DataOverlayButton` components.

**Changes**:
1. Add `subtitle?: string` to `LayoutProps` interface
2. Import or use existing typography/truncation utility classes (e.g., `flex-1 min-w-0 truncate`)
3. Render subtitle inside the header bar below the title `<h1>`, only if defined
4. Apply `truncate` class to handle long names in narrow header space
5. Use semantic HTML and Tailwind classes consistent with existing header styling

**Test-first**: Yes — Write a test asserting that when `subtitle` prop is passed to `PageLayout`, it renders in the header with proper truncation.

**Acceptance**: PageLayout accepts optional subtitle, renders it in header below title, truncates long content, works with existing `rightContent` buttons.

---

### Task 2: Update AssistantDetailsPage to pass assistant name as subtitle

**File**: `src/pages/assistants/AssistantDetailsPage.tsx`

**Description**: Thread the assistant name from component state into the PageLayout as a `subtitle` prop. Use optional chaining to handle the loading state (name is `null` while `isLoading=true`).

**Changes**:
1. Locate the `<PageLayout title="Assistant Details" ... >` call
2. Add `subtitle={assistant?.name}` prop
3. The existing `assistant` state is already available post-fetch; no additional data fetching needed
4. Loading state is handled automatically via optional chaining (renders empty string if `assistant` is `null`)

**Test-first**: Yes — Update existing integration tests to assert the assistant name appears in the header using `screen.getByRole('heading', { level: 1 })` and verify it contains or is followed by the assistant name text.

**Acceptance**: AssistantDetailsPage header shows assistant name below "Assistant Details" label; name appears during scroll; loading state handled gracefully.

---

### Task 3: Update EditAssistantPage to pass assistant name as subtitle

**File**: `src/pages/assistants/EditAssistantPage.tsx`

**Description**: Thread the assistant name into PageLayout subtitle, same pattern as AssistantDetailsPage. Handle the loading state and ensure `rightContent` action buttons are not affected.

**Changes**:
1. Locate the `<PageLayout title="Edit Assistant" ... >` call
2. Add `subtitle={assistant?.name}` prop
3. Verify that `rightContent` buttons remain properly aligned
4. Loading state handled via optional chaining

**Test-first**: Yes — Write a basic integration test for EditAssistantPage verifying the header name is displayed. (Current coverage gap: no integration test file exists for EditAssistantPage.)

**Acceptance**: EditAssistantPage header shows assistant name below "Edit Assistant" label; name visible during scroll; rightContent buttons unaffected; no layout shift on load completion.

---

## Design Decisions

1. **Subtitle prop approach over renderHeader escape hatch**: Added a typed `subtitle` prop to `PageLayout` rather than using the existing `renderHeader` override. This is cleaner, consistent with existing component patterns (`Card`, `DataOverlayButton`), backward-compatible (prop is optional), and avoids duplicating header markup across two pages.

2. **Optional chaining for loading state**: Use `assistant?.name` in the prop value. During loading, `assistant` is `null`, so the subtitle is `undefined` and does not render (appears as empty string in header). Once the API fetch completes, the name populates automatically.

3. **Truncation for long names**: Apply `flex-1 min-w-0 truncate` utility classes to the subtitle in the header. This pattern is already used in `AssistantDetailsProfile` (scrollable-body name display) and will keep the name from pushing action buttons or breaking layout in the Edit page.

4. **No sticky CSS changes**: The header is already effectively sticky by layout (it sits at the top of a flex column; scrolling occurs in the sibling content div). No `position: sticky` CSS change needed.

---

## Testing Strategy

1. **Unit-level**: PageLayout renders subtitle when provided; omits it when `undefined`.
2. **Integration-level**: 
   - AssistantDetailsPage: Update existing tests to assert name in header `<h1>` region (currently assert name in body; extend to header).
   - EditAssistantPage: Write new integration test file covering header name display (current gap).
3. **Manual verification**: Scroll on both pages; confirm name stays visible and buttons remain aligned on Edit page.

---

## Risk Mitigation

- **Loading race**: Optional chaining handles `null` state; header safely renders empty during load.
- **PageLayout shared component**: Subtitle prop is optional and backward-compatible; existing callers unaffected.
- **Name overflow**: Truncation via Tailwind utilities applied to subtitle.
- **Edit page space**: Verify `rightContent` buttons still fit; if layout shifts on load, adjust flex proportions in PageLayout header layout.
- **A2A variant**: Both `AssistantDetails` and `RemoteAssistantDetails` use the same PageLayout call; single `subtitle` prop covers both.

---

## Acceptance Criteria

- ✓ Assistant name appears in header on Assistant Details page below "Assistant Details" label
- ✓ Assistant name appears in header on Edit Assistant page below "Edit Assistant" label
- ✓ Name remains visible when scrolling down on both pages
- ✓ Long names are truncated gracefully (with ellipsis) in the header
- ✓ Edit Assistant page action buttons remain properly aligned
- ✓ Loading state handled gracefully (no error if name is not yet loaded)
- ✓ No visual regressions on other pages using PageLayout
- ✓ Existing integration tests for AssistantDetailsPage continue to pass (optionally extended to assert header name)
- ✓ New integration test for EditAssistantPage verifies header name display
