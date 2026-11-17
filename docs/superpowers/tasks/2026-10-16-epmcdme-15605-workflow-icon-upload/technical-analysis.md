# Technical Research

**Task**: workflow icon upload assistant
**Generated**: 2026-10-16
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-15605: Workflows: allow uploading an icon file instead of only providing an icon URL

## Summary
Allow users to upload an icon image for a workflow, in addition to setting an icon URL.

## Description
When creating or editing an assistant, users can upload an icon image. Workflows currently only support an icon_url, so users must host an image elsewhere and rely on that link remaining available.
Let users upload a workflow icon using the same mechanism and limits as assistant icons, while preserving the existing icon URL option and compatibility with workflow YAML configurations.

## Preconditions
- The user is authenticated and can create or edit the relevant workflow.
- The assistant icon upload mechanism and its file type and size limits are available for reuse.

## Scenarios of Use
1. A user creates or edits a workflow and chooses to upload an icon image.
2. The form validates the selected file and shows a preview before saving.
3. The user can replace or remove the uploaded icon, or use the existing URL input as an alternative.
4. On save, the uploaded icon is stored using the assistant icon mechanism and its resulting URL is saved in the workflow's icon_url field.
5. The workflow icon is displayed wherever it currently appears, including the workflow list, workflow page, conversations, and user preferences.
6. Existing workflows configured with an icon_url continue to display their icons without migration.

## Affected Areas (note: this is codemie-ui, the frontend repo only — backend changes in the separate codemie repo are out of scope here)
- codemie-ui (frontend): workflow create/edit form and workflow icon display locations.
- Workflow YAML configuration and existing icon_url handling.
- Workflow edit permissions.

## Acceptance Criteria
1. A user can upload an image as a workflow icon during workflow creation and editing, and sees a preview before saving.
2. Allowed file types and maximum file size match those for assistant icons. Invalid files are rejected with a clear message.
3. After saving, the uploaded icon is displayed wherever the workflow icon currently appears, including the workflow list, workflow page, conversations, and user preferences.
4. A user can replace or remove an uploaded icon.
5. A user can still set a workflow icon using a URL.
6. Existing workflows with an icon_url continue working without migration, and YAML icon_url configuration continues to work as before.
7. Only users who can edit a workflow can change its icon.
8. Assistant icon behavior remains unchanged.
9. Icon cropping and editing tools are out of scope.

Find: (a) how assistant icon upload works today (component, validation rules — file types/size limits, storage/upload API call, preview UI, remove/replace UI); (b) how workflow icon_url is currently defined, used in create/edit forms, and rendered in all display locations (workflow list, workflow page, conversations, user preferences); (c) workflow edit permission checks relevant to icon changes; (d) any shared icon-upload component/hook that could be reused directly for workflows instead of duplicating assistant-specific code.

---

## 2. Codebase Findings

### Existing Implementations

**Assistant icon upload chain (reusable, generic — not assistant-specific under the hood):**
- `src/pages/assistants/components/AssistantForm/components/AssistantSetup/AssistantSetupSection.tsx:94-108` — wires `react-hook-form` `Controller` for field `icon_url` to `LogoUploadPanel`.
- `src/pages/assistants/components/AssistantForm/components/AssistantSetup/LogoUploadPanel.tsx` — combines `ImageUploadField` (upload) + `LogoUrlInputField` (URL text input) in one panel; tracks `isUploadedFile` to decide whether to show the raw URL or a derived filename.
- `src/pages/assistants/components/AssistantForm/components/AssistantSetup/ImageUploadField.tsx` — thin wrapper around the **generic, non-assistant-specific** `src/components/form/ImageUpload/ImageUpload.tsx`, passing `maxSizeMB={0.5}`.
- `src/components/form/ImageUpload/ImageUpload.tsx` — the actual shared upload widget: drag-and-drop (`useDragAndDrop`), hidden `<input type="file" accept="image/*">`, renders `ImageLoader` / `ImagePreview` (with upload/remove buttons) / `ImageDropZone` depending on state. Takes `value`, `onChange`, `maxSizeMB`, `disabled`, `isCompactView`.
- `src/components/form/ImageUpload/hooks/useFileUpload.ts` — validation + upload logic: rejects non-`image/*` MIME types and files over `maxSizeMB` (converted to bytes), shows a 1s minimum loader (`MINIMUM_LOADER_DISPLAY_MS`), uploads via `filesStore.uploadFiles([file])`, then resolves the URL via `filesStore.getFileURL(...)` and calls `onChange(fileUrl)`.
- `src/pages/assistants/components/AssistantForm/components/AssistantSetup/LogoUrlInputField.tsx` — plain `Input` for a direct image URL plus an `InfoBox` stating the limits ("Must be JPEG, PNG, SVG and max size 500kb").
- `src/pages/assistants/components/AssistantForm/components/AssistantSetup/utils/getFileNameFromUrl.ts` — `isBackendFileUrl` / `getFileNameFromUrl` decode a backend-hosted file URL (`/v1/files/<encoded-id>`) back to the original filename, used to show a friendly name instead of the raw URL once a file has been uploaded.

None of `ImageUpload`, `useFileUpload`, or `ImageUploadField`'s sibling pieces reference "assistant" by name or type — this is a generic form widget already living outside `pages/assistants`, making it directly reusable for a workflow field.

**Workflow icon_url — current state:**
- `src/types/entity/workflow.ts:32-50` — `Workflow` interface already has `icon_url?: string`.
- `src/pages/workflows/components/workflowSchema.ts:54-62` — `WorkflowFormValues` already includes `icon_url?: string | null`; no Yup validation rule constrains it today.
- `src/pages/workflows/components/WorkflowFormFields.tsx` — renders `ProjectSelector`, `Input`, `MarketplaceCategories`, `Switch`, `Textarea`, `WorkflowConfigField`, `ZoomableImage`. **No icon/logo field is rendered anywhere in this file** — `icon_url` exists in the type/schema but has no UI control today. This is the gap the ticket is asking to close.
- `src/pages/workflows/components/WorkflowForm.tsx` / `WorkflowFormFields.tsx` is used by both `NewWorkflowPage.tsx` and `EditWorkflowPage.tsx` (and the execution-time `WorkflowExecutionConfigForm.tsx`), so one new field here covers create, edit, and clone.

**Workflow icon display locations found:**
- `src/pages/workflows/components/WorkflowCard.tsx` — workflow list/grid card; interface has `icon_url?: string` (exact rendering line not inspected, but field is present on the type consumed by `WorkflowsList`, `FavoritesPage`, `WorkflowTemplates`).
- `src/pages/workflows/components/ViewWorkflowHeader.tsx:94-99` — workflow details page header, renders `<Avatar iconUrl={workflow.icon_url} name={workflow.name} type={AvatarType.MEDIUM} />`.
- `src/pages/workflows/details/WorkflowExecutionHeader.tsx` — execution header interface also carries `icon_url?: string`.
- `src/pages/chat/components/ChatSidebar/ChatSidebarWorkflows.tsx:89-94` — "recent workflows" sidebar section (this is almost certainly the "user preferences" surface the ticket means — client-persisted recent-workflow list, not a settings page), renders `<Avatar iconUrl={workflow.icon_url} ... type={AvatarType.XS} />`.
- `src/pages/chat/hooks/useChatItemAvatar.ts:28-62` — `resolveChatAvatar` / `resolveGroupChatAvatars`: this is the **conversations** location. It looks up `workflow.icon_url` from `workflows` / `recentWorkflows` / `chatWorkflows` snapshots by `chat.initialWorkflowId` to resolve the avatar shown on a chat/conversation item.
- `src/components/Avatar/Avatar.tsx` — single shared avatar renderer used by all of the above; takes `iconUrl` and falls back to a generated avatar (`generateAssistantAvatarDataUrl`, feature-flagged) or a static `aiAvatarImage`. No workflow-specific logic here — it is pure `iconUrl`/`name` rendering, so any URL the upload flow produces (same `/v1/files/...` shape as assistants) displays correctly without new code in `Avatar`.

### Architecture and Layers Affected
- **Form layer** (`src/pages/workflows/components/WorkflowFormFields.tsx`, `workflowSchema.ts`): needs a new icon field wired through `react-hook-form`/`Controller`, mirroring `AssistantSetupSection.tsx`.
- **Shared form widgets layer** (`src/components/form/ImageUpload/*`): already generic; consumed as-is, no changes anticipated here.
- **Display layer**: `WorkflowCard`, `ViewWorkflowHeader`, `WorkflowExecutionHeader`, `ChatSidebarWorkflows`, `useChatItemAvatar` — all already read `workflow.icon_url` through `Avatar`; they require no change since the backing value's *shape* (a URL) is unchanged, only its *source* (upload vs. manual entry) changes.
- **Store layer**: `src/store/files.ts` (`filesStore.uploadFiles`, `filesStore.getFileURL`) is the upload API client already used by the assistant flow; `src/store/workflows.ts` (`workflowsStore`) owns workflow CRUD and would carry `icon_url` through unchanged (it's `[key: string]: any` on the `Workflow`-adjacent interfaces, so no store-side type change is forced).
- **Permissions layer**: `src/utils/entity.ts` — `canEdit(workflow)` / `canDelete(workflow)` gate the existing "Edit" action in `WorkflowsList.tsx` and the "Edit" button in `ViewWorkflowHeader.tsx`. Any new icon control placed inside the existing edit form is already behind the page-level edit permission; no new permission check was found to be necessary beyond what already gates reaching the form.

### Integration Points
- `filesStore.uploadFiles([file])` / `filesStore.getFileURL(...)` — backend file-upload API, shared and already workflow-agnostic.
- `react-hook-form` `Controller` pattern — identical wiring style used for every other `AssistantSetupSection` field and already used elsewhere in `WorkflowFormFields.tsx` for other fields (e.g. `name`, `description`, `project`, `shared`).
- YAML config: `icon_url` is a plain top-level `Workflow`/`WorkflowFormValues` field, independent of `yaml_config` parsing — the YAML round-trip (`serialize`/`createworkflowEditor`) was not seen to touch `icon_url`, consistent with the acceptance criterion that YAML `icon_url` config keeps working unmodified.

### Patterns and Conventions
- Field-level upload/URL dual-input pattern: a `Controller`-wrapped composite component (`LogoUploadPanel`) exposing a single `value`/`onChange`/`onBlur`/`error` contract, so it drops into any RHF form without special-casing.
- Validation message convention: inline `uploadError` state inside `useFileUpload`, surfaced via the generic `error` prop chain rather than Yup — size/type checks happen client-side before the network call.
- File URL identification convention: `isBackendFileUrl`/`getFileNameFromUrl` in `AssistantSetup/utils/` — currently assistant-scoped by path, but has no assistant-specific logic; reusable as-is or trivially moved/shared.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/patterns/form-patterns.md` — building a form (P1 guide for this ticket's category).
- `.ai-run/guides/components/reusable-components.md` — "looking for something that already exists before writing it"; directly relevant since `ImageUpload` already exists and should be reused rather than duplicated.
- `.ai-run/guides/development/workflow-editor-patterns.md` — relevant if the icon field needs to interact with the visual workflow editor's config panels (it appears `icon_url` lives in the top-level workflow fields, not the node/editor config, so this guide is likely only tangential).
- `.ai-run/guides/patterns/accessibility-patterns.md` — relevant for the upload control's icon-only buttons/labels.
- These guides were not opened in full (routed per `.ai-run/guides/README.md`); only the index was read in this pass. The planning/spec stage should open the specific P0 guide(s) named in `AGENTS.md`'s Task Routing table before implementing.

### Architectural Decisions
No ADRs or inline comments were found that constrain how `icon_url` must be populated — the only constraint discovered is the `WorkflowFormValues`/`Workflow` type already declaring it optional, and the shared upload widget's existing 0.5MB/`image/*` limits used by the assistant form.

### Derived Conventions
- Reuse over duplication: the assistant icon mechanism is already generic (`src/components/form/ImageUpload`), so the natural implementation path is composing the same primitives into a `WorkflowFormFields` field, not writing a workflow-specific uploader.
- Keep upload limits centralized: the `0.5` MB limit is currently passed as a literal prop at each call site (`ImageUploadField.tsx:30`) rather than a shared constant — note for whoever implements, not a requirement to change it.

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/workflows/components/__tests__/WorkflowForm.test.tsx`, `WorkflowFormFields.test.tsx` — cover the workflow form today (pre-icon-field).
- `src/pages/workflows/components/__tests__/WorkflowCard.test.tsx`, `WorkflowCard.duplicateId.test.tsx` — use a `makeWorkflow` fixture builder; icon_url is part of the `Workflow` type these fixtures build.
- `src/pages/workflows/components/__tests__/WorkflowActions.test.tsx`, `WorkflowActions.accessibility.test.tsx` — also use `makeWorkflow`.
- `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.projectModels.test.tsx` — the only test found exercising `LogoUploadPanel` indirectly (via caller chain); no dedicated unit test for `LogoUploadPanel`, `ImageUploadField`, or `useFileUpload` was surfaced in this exploration.
- No test file for `src/components/form/ImageUpload/*` (the generic widget) was found within the explored call graph.

### Testing Framework and Patterns
Vitest + React Testing Library, per `AGENTS.md`; two projects (`unit`, `integration`). Fixture-builder convention (`makeWorkflow(...)`) is used across workflow component tests.

### Coverage Gaps
- The shared `ImageUpload`/`useFileUpload` widget appears to have no direct unit test in the files surfaced — risk if its behavior needs to be verified from the workflow side too.
- No existing test touches `icon_url` as a form field for workflows (there is no field to test yet).
- `useChatItemAvatar.ts` (conversations display) and `ChatSidebarWorkflows.tsx` (recent-workflows/"preferences" display) were not confirmed to have dedicated icon-rendering tests in this pass — only `ChatSidebar.test.tsx` was referenced as testing a caller of `useRecentChats`, not `useChatItemAvatar` specifically.

---

## 5. Configuration and Environment

### Environment Variables
None specific to icon upload were found. Runtime config (`window._env_`, `EnvConfig` in `src/types/global.ts`) only covers `VITE_ENV`, `VITE_API_URL`, `VITE_APP_VERSION` — unrelated to file upload limits.

### Configuration Files
No feature-flag or config-file gating was found for the assistant icon upload mechanism itself — it is unconditionally available in the assistant form. One related flag exists for *fallback display*: `useFeatureFlag('features:generatedAssistantIcons')` in `Avatar.tsx`, which only affects the fallback icon shown when `iconUrl` is empty, not upload behavior.

### Feature Flags and Deployment Concerns
No deployment-specific concern was identified for this change — the upload path reuses the existing `filesStore` backend endpoint already exercised by assistants, so no new infrastructure surface was found.

---

## 6. Risk Indicators

- `WorkflowFormFields.tsx` has no icon UI today — adding one is a net-new control, not a straightforward prop pass-through; the exact placement/layout within the existing form (which already has `ProjectSelector`, categories, sharing switch, etc.) will need UI judgement during planning, not just wiring.
- Speculative: the assistant-side upload utility `getFileNameFromUrl.ts` lives under `AssistantSetup/utils/` — if the workflow field needs the same "show filename instead of raw URL" behavior, that util may need to move to a shared location (or be imported cross-feature) rather than being duplicated; confirm during planning whether cross-importing from `pages/assistants` into `pages/workflows` is acceptable per `.ai-run/guides/development/code-organization.md`.
- No dedicated unit tests were found for `ImageUpload`/`useFileUpload` (the component this task depends on most), nor for `useChatItemAvatar.ts` — regressions in the shared upload widget or in conversation-avatar resolution would not be caught by an existing suite.
- "User preferences" from the ticket's scenario 5 was not confirmed as a literal settings page; the closest matching surface found is the client-persisted "recent workflows" sidebar section (`ChatSidebarWorkflows.tsx`) and `recentWorkflows`/`chatWorkflows` snapshots consumed by `useChatItemAvatar.ts`. If the ticket author means something else (e.g. a dedicated user-settings screen), it was not located in this pass and should be confirmed with the ticket author or during spec.
- `canEdit`/`canDelete` permission checks were confirmed at the list/header action level (`WorkflowsList.tsx`, `ViewWorkflowHeader.tsx`), but no explicit check was found gating field-level edits *inside* the workflow form itself — the assumption that reaching the edit form already implies edit permission (consistent with how the assistant form works) was not falsified, but also not positively confirmed by a form-level guard.

---

## 7. Summary for Complexity Assessment

This task touches the **form layer** (`WorkflowFormFields.tsx` / `workflowSchema.ts`) to add a currently-missing icon input, and the **display layer** only incidentally — `WorkflowCard`, `ViewWorkflowHeader`, `WorkflowExecutionHeader`, `ChatSidebarWorkflows`, and `useChatItemAvatar` already read and render `workflow.icon_url` via the shared `Avatar` component, so no display-side code changes were found to be required; they will "just work" once the form writes a URL into the same field, upload or manual. The upload mechanism itself (`ImageUpload`, `useFileUpload`, `filesStore`) is already generic and backend-agnostic of "assistant" vs. "workflow," making this primarily a composition task: wire the existing `LogoUploadPanel`-equivalent pattern into `WorkflowFormFields` via a new `Controller`-bound field, matching `AssistantSetupSection.tsx`'s approach.

Technical novelty is low — this is a known, working pattern being extended to a second entity type, not a new mechanism. The main design decision left open is UI placement within the already-populated workflow form, and whether the assistant-scoped `getFileNameFromUrl` util should be shared or duplicated. Test coverage posture is a moderate risk: the shared upload widget and the conversation-avatar resolver have no dedicated unit tests surfaced in this research, so new coverage will likely need to be authored alongside the feature rather than extended from existing suites. No backend, routing, or YAML-serialization changes were found to be implicated — `icon_url` is a plain top-level field independent of `yaml_config`.

---

## 8. External References

None named by the task. The ticket is a self-contained description with no linked file paths or URLs to external documents.
