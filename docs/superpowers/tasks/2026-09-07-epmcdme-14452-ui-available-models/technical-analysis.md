# Technical Research

**Task**: project-settings model-management ui
**Generated**: 2026-09-07T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

Implement UI for "Available Models" section in project settings. Display chat and image generation models with ability to rule out models per project. Prevent saving if zero chat models remain. Handle new/removed models and platform visibility.

---

## 2. Codebase Findings

### Existing Implementations

**Project Settings Page**:
- `src/pages/settings/administration/ProjectDetailsPage.tsx` — Main project details page; authorizes user access, loads/displays project data, manages edit UI
- `src/pages/settings/administration/projectsManagement/ProjectModal.tsx` — Form modal pattern with react-hook-form + Yup validation; example of error handling and controller-based inputs
- `src/pages/settings/administration/projectsManagement/ProjectBudgetsSection.tsx` — Similar card-based section UI; reference for layout and styling patterns

**Component Library (Reuse)**:
- `src/components/form/Checkbox.tsx` — PrimeReact-based checkbox with label, tooltip, disabled state, error message display; perfect for model selection
- `src/components/form/Input.tsx` — Input field component; usable for optional search/filter
- `src/utils/toaster.ts` — Toast notifications (success, error, info); use for feedback messages

**Data & API**:
- `src/store/projects.ts` — Valtio proxy store for project CRUD; fetches project details via `getProject(projectName, true)` which returns `ProjectDetail` with metadata
- `src/store/user.ts` — User authentication store with role flags: `isAdmin`, `isMaintainer`, `applicationsAdmin` array
- `src/utils/api.ts` — API client with `.get()`, `.post()`, `.patch()` methods; handles error parsing into `parsedError` object with `message`, `details`, `help` fields

**Type Definitions**:
- `src/types/entity/projectManagement.ts` — `ProjectDetail` interface; currently lacks `allowed_models` field
- `src/types/entity/project.ts` — General project entity types

### Architecture and Layers Affected

**Presentation Layer**:
- React component tree under `ProjectDetailsPage`
- New section component displaying model catalog
- Checkbox list UI for model selection (grouped by category: chat vs. image generation)

**State Management Layer**:
- Valtio store (`projectsStore`) — Add method `updateAllowedModels(projectName, allowed_models)` alongside existing `updateProject()` pattern
- Component state for UI interaction (selected models, loading flags, validation state)

**API Integration Layer**:
- `GET /v1/projects/{projectName}` — Fetch current `allowed_models` (already called by `getProject()`)
- `GET /v1/llm_models?include_all=false` — Fetch chat models catalog
- `GET /v1/llm_models/image_generation?include_all=false` — Fetch image generation models
- `PATCH /v1/projects/{projectName}/allowed-models` — Update allowed models with new payload `{ allowed_models: string[] | null }`

**Authorization Layer**:
- Check user roles: `isAdmin`, `isMaintainer`, or `applicationsAdmin.includes(projectName)`
- Conditionally show/hide edit UI or render read-only view
- Backend enforces authorization via `project_service.check_allowed_models_authorization()`

### Integration Points

**Internal Dependencies**:
- `projectsStore` → Valtio proxy with async methods
- `userStore` → Role/permission flags for authorization checks
- `SettingsLayout` — Page wrapper component with consistent styling
- `Checkbox`, `Input` components — Reusable form elements
- `toaster` — Notification system

**Backend Services**:
- LLM Models API (`/v1/llm_models`) — Returns list of available chat and image generation models with fields: `id`, `name`, `category`, `disabled`, `forbidden_for_web`, `description`
- Projects API (`/v1/projects/{projectName}`) — Returns `ProjectDetail` with `allowed_models` field
- Projects API (`PATCH /v1/projects/{projectName}/allowed-models`) — Updates allowed models; backend validates at-least-one-chat-model rule and returns updated project

### Patterns and Conventions

**Store Pattern** (Valtio):
```typescript
export const projectsStore = proxy({
  data: [],
  async fetchProject(name, include_spending) { /* api.get(), update this.data */ },
  async updateProject(name, payload) { /* api.patch(), return result */ }
})
// Usage: const { data } = useSnapshot(projectsStore)
```

**Form Validation Pattern**:
- Yup schema for client-side validation (e.g., `.required()`, `.matches(REGEX)`)
- Attach to react-hook-form via `@hookform/resolvers/yup`
- Server errors parsed from `response.parsedError` and shown inline or via toast

**Authorization Check Pattern**:
```typescript
const isMaintainer = currentUser?.isMaintainer ?? false
const isAdmin = currentUser?.isAdmin ?? false
const isProjectAdmin = currentUser?.applicationsAdmin?.includes(projectName) ?? false
const canManage = !isPersonalProject && (isAdmin || isMaintainer || isProjectAdmin)
```

**Async Data Loading Pattern**:
- `useState` for data, loading flag, error state
- `useCallback` with dependency array to define fetch logic
- `useEffect` to invoke on mount or dependency change
- Finally block to reset loading flag

**Error Handling Pattern**:
```typescript
try {
  await store.updateX(payload)
  toaster.info('Success message')
} catch (error: any) {
  toaster.error(error?.parsedError?.message || 'Error')
}
```

**Design Tokens**:
- Colors: `bg-surface-base-secondary`, `border-border-structural`, `text-text-quaternary`
- Spacing: `gap-4`, `gap-6`, `p-4`
- Typography: `text-sm`, `text-xs` for labels
- Layout: `grid grid-cols-1 xl:grid-cols-2` for responsive sections

---

## 3. Documentation Findings

### Guides and Architecture Docs

**Available Guides** (from `.ai-run/guides/`):
- No guides specifically covering project settings UI patterns
- General patterns inferred from existing `ProjectDetailsPage` and `ProjectModal` implementations

### Architectural Decisions

**State Management**:
- Decision: Use Valtio for project-level data (vs. Redux, Context, or other)
- Rationale: Existing codebase uses Valtio; new allowed_models feature should follow the same pattern
- Implication: Store method will be async, return updated project data, let component handle errors

**Form Validation**:
- Decision: Yup for schema + react-hook-form for binding (vs. Formik or manual)
- Rationale: ProjectModal uses this pattern; consistency with existing code
- Implication: Use `@hookform/resolvers/yup` and Controller-based inputs

**Authorization**:
- Decision: Check roles in component before rendering edit UI (vs. backend-only gating)
- Rationale: Better UX; let user see read-only view; backend still enforces access control
- Implication: Read from `userStore` for authorization flags

### Derived Conventions

From code exploration, conventions include:

1. **Async Store Methods**: Named `fetch*()` or `update*()`, throw on error, caller handles via try-catch
2. **Component State**: Separate state for data, loading, error flags; reset on unmount or dependency change
3. **Error Messages**: Extract from `error.parsedError.message`, fallback to generic "Error"
4. **Toast Notifications**: Use `toaster.info()`, `.error()`, `.success()` for transient feedback
5. **Disabled UI State**: Use Tailwind `opacity-50 cursor-not-allowed` for unavailable checkboxes
6. **Grid Layouts**: Responsive with `grid grid-cols-1 xl:grid-cols-2` for desktop/mobile
7. **Card Styling**: `bg-surface-base-secondary border border-border-structural` for section containers

---

## 4. Testing Landscape

### Existing Coverage

**Project Settings Tests**:
- `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx` — Unit tests for ProjectDetailsPage; covers authorization, data loading, error states
- `src/pages/settings/administration/projectsManagement/__tests__/ProjectModal.test.tsx` — Tests for form modal; covers form submission, validation error display

**Store Tests**:
- `src/store/__tests__/projects.test.ts` — Unit tests for projectsStore; covers fetch, update, error handling patterns

**Component Tests**:
- `src/components/form/__tests__/Checkbox.test.tsx` — Tests for Checkbox component; covers checked/unchecked, disabled, error states

### Testing Framework and Patterns

**Framework**: Jest + React Testing Library (RTL)

**Patterns**:
- Mock `api.get()` and `api.patch()` via jest.mock
- Mock `toaster` to verify notification calls
- Render component with test providers (may require store setup)
- Use `screen.getByRole()`, `screen.getByText()` for queries
- Fire events via `userEvent` or `fireEvent`
- Assert component state after interactions

### Coverage Gaps

**For this feature**:
- No existing tests for model selection UI (new component)
- No existing tests for "at least one chat model" validation logic (new)
- No existing tests for allowed_models update flow (new endpoint)

**Test Plan** (see Stage 4):
- Unit tests for AvailableModelsSection component (load, select, save)
- Store method tests for `updateAllowedModels()`
- Integration test for authorization checks
- Validation test for "zero chat models" scenario

---

## 5. Configuration and Environment

### Environment Variables

**Not applicable** — Feature does not require new env vars. Uses existing:
- `VITE_API_BASE_URL` — API endpoint (already configured)
- `VITE_ENV` — Environment mode (dev, prod, etc.)

### Configuration Files

**Routing**:
- `src/router/routes.tsx` — Project settings route already exists; no new route needed

**Design Tokens**:
- `src/styles/tailwind.config.js` (or theme setup) — Already includes color/spacing tokens used

### Feature Flags and Deployment Concerns

**No Feature Flags Required**:
- Feature is always enabled once UI is complete
- Backend already enforces authorization (maintainer/admin only)
- No A/B testing or gradual rollout needed

**Deployment Concerns**:
- None — purely client-side UI. Backend is already live.

---

## 6. Risk Indicators

- **Authorization edge case**: Ensure personal projects never show "Available Models" section (personal projects should not have model restrictions)
- **At-least-one-chat-model validation**: Must be enforced client-side before PATCH; backend has separate enforcement as defense-in-depth
- **Model catalog fetch timing**: Need to ensure models are fetched before rendering; handle race conditions
- **Unavailable models (forbidden_for_web, disabled)**: Must render as visually distinct and disable checkbox; test coverage gap
- **Type definition missing**: `ProjectDetail` lacks `allowed_models` field; must add before component renders
- **Store method not yet written**: `updateAllowedModels()` does not exist in `projectsStore`; must be created following async pattern
- **Error message specificity**: Backend returns 400 for "no chat models"; UI must detect and show user-friendly message
- **Loading state race condition**: If user rapidly changes model selection, ensure component state is in sync with latest API response
- **Removed models handling**: If a project's `allowed_models` includes deleted model ID, UI must gracefully display it as "no longer available" (may need `?include_all=true` query param)

---

## 7. Summary for Complexity Assessment

The "Available Models" feature is a **moderately scoped frontend addition** integrating with existing backend APIs and design patterns. The codebase already has strong conventions for state management (Valtio), form handling (react-hook-form + Yup), and error handling (toaster notifications). No novel architectural patterns are needed; the implementation follows proven examples in `ProjectDetailsPage` and `ProjectModal`.

**Layers touched**: Presentation (new React section component), state management (new store method), and API integration (two new endpoint calls). **File change surface**: ~5–8 files including component, types, store method, and tests. **Technical novelty**: Low—all required patterns exist in the codebase; the main challenge is integrating them. **Test coverage posture**: Requires new unit tests for the component and store method, integration tests for authorization and validation scenarios. **Key risks**: Model unavailability handling (forbidden_for_web, disabled states), at-least-one-chat-model validation (must block save), and authorization edge case for personal projects. **Estimated complexity**: **Low-to-Medium** (simple UI, proven patterns, well-defined backend contract, but careful attention needed for edge cases and test coverage).

---

## 8. Complexity Indicators

- **Codebase Familiarity**: High (existing patterns in ProjectDetailsPage, ProjectModal)
- **API Contract Clarity**: High (backend complete with documented endpoints and response models)
- **Technical Novelty**: Low (no new patterns, no cross-cutting concerns)
- **Edge Cases**: Medium (personal project handling, unavailable model display, validation sequencing)
- **Test Coverage Need**: Medium (component, store method, integration tests)
- **Estimated Task Scope**: **5–8 hours**
