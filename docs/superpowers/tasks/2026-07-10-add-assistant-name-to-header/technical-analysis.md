# Technical Research

**Task**: Assistant Details page header / Edit Assistant page header / assistant management UI
**Generated**: 2026-07-10T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Add assistant name to the sticky top header in Assistant Details and Edit Assistant views. Currently headers show only generic text (Details/Edit) without the assistant name. Name should be visible while scrolling.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/assistants/AssistantDetailsPage.tsx` — Page-level container for Assistant Details. Fetches assistant by `id`, `slug`, or `projectName` from route params. Renders `<PageLayout title="Assistant Details" onBack={handleBack}>`. The `assistant` state object is available in this component, so `assistant.name` is accessible once loaded. The `isLoading` state guards the content area.
- `src/pages/assistants/EditAssistantPage.tsx` — Page-level container for Edit Assistant. Fetches assistant with identical pattern (id or slug). Renders `<PageLayout title="Edit Assistant" showBack limitWidth isLoading={isLoading} rightContent={...}>`. The `assistant` state is available here too.
- `src/components/Layouts/Layout/PageLayout.tsx` — Shared layout shell for all content pages. Renders a fixed header bar (`min-h-layout-header h-layout-header`) with optional back button, `title` (as `<h1>`), and `rightContent`. Accepts a `renderHeader` override prop that replaces the entire header content with arbitrary JSX. The header element itself is not `sticky` — it is a normal flex child at the top of a flex column; scrolling is handled by the sibling `overflow-y-auto` content div. The `title` prop only accepts a `string`, so a two-line (title + name) or composite heading requires either passing the name via `renderHeader` or extending the `LayoutProps` interface with a `subtitle` field.
- `src/pages/assistants/components/AssistantDetails/AssistantDetails.tsx` — Content body rendered inside PageLayout for the standard (non-A2A) details view. Renders `AssistantDetailsProfile` in a flex row at the top, which contains the large `<h4>` with `assistant.name`. This name display is inside the scrollable content area, not the fixed header.
- `src/pages/assistants/components/RemoteAssistantDetails/RemoteAssistantDetails.tsx` — Content body for A2A assistant type, used in the same `AssistantDetailsPage`. Also renders `AssistantDetailsProfile` inside scrollable content.
- `src/pages/assistants/components/AssistantDetails/components/AssistantDetailsProfile.tsx` — Renders avatar + name (`<h4 className="name-target text-2xl font-semibold ...">`) + created-by line. This is the existing "hero" name block in the scrollable body.
- `src/pages/assistants/components/AssistantForm/AssistantForm.tsx` — Scrollable form body rendered by `EditAssistantPage`. Does not emit the assistant name back up to the page.

### Architecture and Layers Affected

- **Page layer** (`AssistantDetailsPage`, `EditAssistantPage`): These own the `assistant` state and pass `title` to `PageLayout`. Both must be changed to thread `assistant.name` into the header.
- **Shared layout layer** (`PageLayout`): Currently accepts `title: string`. To show a name below or alongside a generic label it must be extended. Two options:
  1. Add a `subtitle?: string` prop rendered as a second, smaller line inside the header.
  2. Use the existing `renderHeader?: ReactNode` escape hatch and build a custom header inline in each page.
- **Content body components** (`AssistantDetails`, `RemoteAssistantDetails`): No changes required — they continue to display the large hero name in the scrollable body.

### Integration Points

- `useVueRouter` — route params (`id`, `slug`, `projectName`) drive the API fetch; name becomes available after the API call resolves.
- `assistantsStore.getAssistant` / `getAssistantBySlug` / `getAssistantTemplateBySlug` — resolves the `Assistant` object; `assistant.name` is always present on the resolved type (`src/types/entity/assistant.ts` line 90: `name: string`).
- `isLoading` state in both pages — must be respected in the header: the name should not render (or should render as a placeholder) until loading is complete.

### Patterns and Conventions

- **`renderHeader` override pattern**: Used in `ChatPage` (`src/pages/chat/ChatPage.tsx:73`) and `SharedChatPage` (`src/pages/chat/SharedChatPage.tsx:84`) to pass completely custom header JSX to `PageLayout`. This is the established escape hatch for non-standard headers.
- **`subtitle` prop pattern**: `PageLayout`'s `LayoutProps` does NOT currently have a `subtitle` field, but `Layout.tsx` (the tabbed layout variant) does have `subTitle` for the sidebar. `Card` and `DataOverlayButton` components have `subtitle` props following the same naming convention.
- **`rightContent` pattern**: Used in `EditAssistantPage`, `NewAssistantPage`, and many settings pages for action buttons in the header. Must continue to work alongside any name addition.
- **Loading guard**: `isLoading` is already passed to `PageLayout` in `EditAssistantPage` (renders a spinner in the content area). For the header name, the simplest approach is to render `assistant?.name` with optional chaining — it will be `undefined`/empty during load and appear once set.
- **Title text**: `"Assistant Details"` and `"Edit Assistant"` are hardcoded string literals. These can become a label portion if a subtitle variant is added.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No `.ai-run/guides/` directory was found in this repository — this is a frontend UI repo, not the backend Python repo. No architecture decision records were found covering this UI domain.

### Architectural Decisions

No recorded ADRs. Conventions are derived from code exploration below.

### Derived Conventions

- **Component naming**: Page-level files are `*Page.tsx`; reusable components go in `components/`.
- **State management**: Component-local `useState` for page data; `valtio` stores for global state.
- **Tailwind utility classes**: All styling uses Tailwind. Header bar classes (`min-h-layout-header h-layout-header border-b ...`) are defined by CSS variables (tokens starting with `layout-`).
- **Type safety**: All props are typed via TypeScript interfaces. Extending `LayoutProps` requires adding a typed optional field.
- **Loading states**: `isLoading` boolean drives `<Spinner>` renders; async data is typed as `T | null`.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/assistants/__tests__/AssistantDetailsPage.integration.test.tsx` — Comprehensive integration test file (1 400+ lines). Tests cover: initial load and name display, chat/edit navigation, sub-assistant navigation, context menu actions, navigation/back button, error handling, pin/unpin, feature flags, reactions, A2A remote assistant rendering, prompt variables, user mapping, and favorites. Uses `renderPage` utility + `mockAPI` to mock fetch. The assistant name (`"Test Assistant"`) is already asserted in many tests via `screen.getByText('Test Assistant')`.
- `src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx` — Exists (not read in detail, similar pattern).
- No dedicated test file for `EditAssistantPage` was found in the glob results.

### Testing Framework and Patterns

- Framework: **Vitest** + **@testing-library/react** + **@testing-library/user-event**.
- Integration tests use `renderPage(path)` helper (from `@/test-utils/integration`) which renders the full page with router and store context.
- API calls are mocked with `mockAPI(method, path, responseBody, statusCode?)`.
- Router state is mocked via `mockRouterState` from `@/hooks/__mocks__/useVueRouter`.
- Assertions use `screen.getByText`, `screen.getByRole`, `waitFor`.

### Coverage Gaps

- No test currently asserts the header-level title text ("Assistant Details" or "Edit Assistant"). Existing tests find `"Test Assistant"` in the scrollable content body (via `AssistantDetailsProfile`), not the `<h1>` tag in the header.
- If the header is changed to show `assistant.name` in the `<h1>` (e.g., as a subtitle under "Assistant Details"), new assertions should be added to verify the name appears in the header band specifically (e.g., `screen.getByRole('heading', { level: 1, name: ... })` or similar).
- `EditAssistantPage` has no integration test file — any header behavior added there will be entirely uncovered.

---

## 5. Configuration and Environment

### Environment Variables

No environment variables govern header rendering or assistant name display.

### Configuration Files

No configuration files affect this UI feature. Theme appearance (`isDark`, `appearance?.pageHeaderElevated`, `appearance?.gradients`) is already consumed in `PageLayout` and does not gate the name display.

### Feature Flags and Deployment Concerns

No feature flags gate the existing header rendering. The new name display can be unconditional. No deployment concerns beyond standard CI/CD.

---

## 6. Risk Indicators

- **Loading race condition**: `assistant.name` is `null` while `isLoading=true`. The header must handle this gracefully (empty string or skeleton). `EditAssistantPage` already passes `isLoading` to `PageLayout` (which shows a spinner in the content area), but the header bar is always rendered — a `null` name in the header title slot is safe as long as the code uses optional chaining or a fallback string.
- **`PageLayout` is a shared component used across the entire application**: Any additive prop change (`subtitle?: string`) must be backward-compatible (optional). A change to the header layout could visually affect other pages. Using `renderHeader` instead avoids touching `PageLayout` at all, but duplicates header markup across two pages. Both approaches are viable; the `subtitle` prop approach is cleaner and consistent with the `Card` / `DataOverlayButton` pattern already in the codebase.
- **`AssistantDetailsPage` handles two content variants** (`AssistantDetails` for standard and `RemoteAssistantDetails` for A2A): both variants share the same `PageLayout` title, so passing `assistant?.name` is sufficient for both without conditional branching.
- **`EditAssistantPage` has no integration test file**: Any header change there is untested. This is a coverage gap that should be addressed.
- **Title truncation**: Long assistant names need to be truncated in the header (the scrollable-body `AssistantDetailsProfile` already handles this with `truncate` and a `Tooltip`). The header is narrower when `rightContent` buttons are present (Edit Assistant page has three buttons). The `flex-1 min-w-0` + `truncate` pattern used in `AssistantDetailsProfile` should be replicated for the header name.
- **`AssistantDetailsPage` does not pass `showBack` / back button conditionally**: `onBack` is always provided, so the back button is always shown, consuming some horizontal space in the header.
- **No existing sticky header pattern in assistant pages**: The `sticky top-0` class appears in `SharedChatPage`'s `renderHeader` content div, but `PageLayout`'s header div itself is not marked `sticky` — it relies on being at the top of a flex column with the scroll container below. The header is already effectively "sticky" by layout, so no `sticky` CSS change is needed to achieve visible-while-scrolling behavior.

---

## 7. Summary for Complexity Assessment

The task requires adding the assistant name to the sticky header in two pages: `AssistantDetailsPage` and `EditAssistantPage`. Both pages already hold an `assistant` state object after API fetch, and both pass a `title` string to the shared `PageLayout` component. The primary architectural decision is whether to extend `PageLayout` with a `subtitle?: string` prop (adding a second line inside the header) or use the existing `renderHeader?: ReactNode` escape hatch in each page. The `subtitle` approach requires one small interface change to `PageLayout.tsx` and updates to two page files (3 files total, low surface area). The `renderHeader` approach touches only the two page files but duplicates header markup. Neither approach introduces new dependencies or external integrations.

The affected area is purely presentational: UI layer only (Page components + shared layout component). No store, API, type, or routing changes are required — `assistant.name` is already typed as `string` on the `Assistant` interface and is fetched by the existing load logic. The main technical challenge is handling the loading state (name is `null` before fetch completes) and preventing overflow truncation on the name in the header bar, particularly on the Edit page where action buttons consume significant horizontal space.

Test coverage is moderate. `AssistantDetailsPage.integration.test.tsx` is comprehensive but does not currently assert against the header `<h1>` element specifically — new assertions can be added to a subset of existing tests to verify the name appears in the header. `EditAssistantPage` has no integration test at all, making it a coverage gap. If tests are required as part of delivery, at minimum a smoke test for `EditAssistantPage` verifying the header name should be written.
