# Technical Research

**Task**: EPMCDME-7070 — Ability to disable the Attach File button in the chat-bot (frontend consumption of completed backend)
**Generated**: 2026-08-10T15:22:00Z
**Research path**: filesystem
**Repos researched**: Frontend `codemie-ui` (current workspace) · Backend `codemie` (sibling; branch `EPMCDME-7070_disable-attach-file-button`, work already done)

---

## 1. Original Context

EPMCDME-7070 — Ability to disable the Attach File button in the chat-bot.

In some use cases, administrators must prevent users from uploading files through the chat-bot. Today the Attach File control is always visible/active for normal assistants. There should be an easy-to-access configuration (settings / permissions / config) to hide or disable file attachment in chat so users cannot initiate uploads when the option is off.

Preconditions: user can open chat-bot; Attach File is currently shown.

Scenarios:
1. Administrator configures the chat-bot or project to disable file attachments.
2. User opens the chat-bot.
3. Attach File is not visible or is disabled; uploads cannot be started.

Expected result: admins can enable/disable Attach File; when disabled, users cannot attach files via chat.

Affected areas: Chat-bot UI; file attachment logic; chat-bot settings/configuration.

Acceptance criteria:
- Easy-to-access configuration or permission to disable Attach File.
- When disabled, button is hidden or inactive.
- No file uploads can be initiated from chat when the option is set.

**Caller context (this SDLC run):** frontend-only in `codemie-ui`. Backend already shipped `file_attachment_enabled` on assistants/projects with chat-time 403 enforcement. UI must consume that flag and honor it on attach surfaces / settings.

---

## 2. Codebase Findings

### Existing Implementations

**BACKEND (`codemie`) — COMPLETED**

Canonical field (not a customer-config feature flag; not an RBAC permission):

| Item | Value |
|------|--------|
| Field | `file_attachment_enabled: Optional[bool]` |
| Default | `None` (= allowed; only explicit `False` disables) |
| Tables | `assistants`, `assistant_configurations`, `applications` (projects) |
| Migration | `src/external/alembic/versions/u2v3w4x5y6z7_add_file_attachment_enabled.py` (rev `u2v3w4x5y6z7`, down `9b9b4c585e54`) |

Models:
- `AssistantRequest.file_attachment_enabled` — `src/codemie/rest_api/models/assistant.py` (~332)
- `AssistantBase` / `Assistant` / `AssistantConfiguration` — same file (~659, ~1252)
- `Application.file_attachment_enabled` — `src/codemie/core/models.py` (~394)

Enforcement:
- `_validate_file_attachment_allowed_and_raise` in `src/codemie/rest_api/routers/assistant_validators.py`
- Called from chat paths in `assistant.py` when `file_names` is non-empty (`POST /v1/assistants/{id}/model`, slug variant; virtual assistant path also validates)
- Precedence: assistant `False` → 403; else if assistant has `project` and project `False` → 403; `None`/`True` → allowed
- 403 payload: message `"File attachment not allowed"`; details/help distinguish assistant vs project

Exposed for UI read/write:
- **Read:** full assistant detail `GET /v1/assistants/id/{id}`, `GET /v1/assistants/slug/{slug}`, version endpoints — **not** on `AssistantListResponse`
- **Write:** `POST /v1/assistants`, `PUT /v1/assistants/{id}` via `AssistantRequest`
- Version service propagates field on create/rollback/config update (`assistant_version_service.py`)

Gaps on backend relative to full admin UX:
- Projects REST DTOs (`ProjectCreateRequest` / `ProjectUpdateRequest` / `ProjectDetailResponse`) do **not** expose `file_attachment_enabled` yet — project column + chat enforcement exist; no Projects HTTP surface to set/read from UI
- Abandoned research approach: `features:chatFileAttachment` via `GET /v1/config` — **not** in final impl (plan: “No customer-level feature flag”)
- Deferred CR: workflow execution accepting `file_names` may bypass this guard

Backend unit tests: `tests/unit/routers/test_assistant_file_attachment.py` (8 cases for validator).

**FRONTEND (`codemie-ui`) — NOT WIRED YET**

Attach File UI:
- Toolbar: `src/pages/chat/components/ChatPrompt/ChatPromptFileUpload.tsx` — `aria-label="Attach files"`, `AttachmentSvg`, hidden file input, file chips
- Host: `ChatPrompt.tsx` mounts upload when allowed:
  ```tsx
  {assistantFeatures.fileAttachment && (
    <ChatPromptFileUpload {...fileUpload} files={files} />
  )}
  ```
- Edit-mode message attach: `ChatUserMessage.tsx` — literal **"Attach File"** button; uses `useFileUpload`; **does not** check `assistantFeatures.fileAttachment`
- Reuse: `ContinueWithInputPopup.tsx`, workflow start popup also render `ChatPromptFileUpload`

Upload pipeline:
- `useFileUpload` (`src/hooks/useFileUpload.tsx`) → `filesStore.uploadFiles` → `POST v1/files/bulk`
- Paste: `useFilePaste` wired in `ChatPrompt` as `onFilePaste: fileUpload.addFiles`
- Image drop/paste: Quill `imageDropAndPaste` → Editor `onAddFiles`
- Send: `chatGenerationStore.createChatGeneration({ files: fileIds, ... })` → chat model endpoints with `file_names`

Existing capability gate (type-based only):
- `useAssistantFeatures` (`src/pages/chat/hooks/useAssistantFeatures.ts`)
- `AssistantFeatures.fileAttachment` defaults `true`; forced `false` only for `AssistantType.BEDROCK_AGENTCORE_RUNTIME`
- AND-reduction across assistants on the chat
- **Does not** read `file_attachment_enabled` from API

Chat assistant payload gap:
- `AssistantData` in `src/types/entity/conversation.ts` only has `id`, `name`, `iconUrl`, starters, context, tools, `type` — **no** `file_attachment_enabled`
- Full `Assistant` type in `src/types/entity/assistant.ts` has `enable_image_generation`, `smart_tool_selection_enabled`, `interactive_features`, etc. — **no** `file_attachment_enabled` yet
- Grep for `file_attachment_enabled` / `fileAttachmentEnabled` in UI: **zero** hits outside chat type-gate naming

Settings surfaces (best homes for admin toggle):
- **Primary:** `AssistantForm.tsx` — accordion+Switch pattern (`enable_image_generation` ~676–732; `InteractiveFeaturesSection`) + Yup schema + `compareFormData.ts` + `transformAssistantToCreateDTO` (`store/utils/assistants.ts`) via `POST`/`PUT v1/assistants`
- Also appears in chat side panel via `ChatConfigAssistantForm` embedding `AssistantForm`
- **Secondary (blocked on API):** `ProjectModal.tsx` / `ProjectDetailsPage` — Switch pattern exists (`enforce_member_spend_limits`); project types/store omit attachment field; backend Projects API omits field

Closest analogous UI gates:
- Chat toolbar: `assistantFeatures.*` + `useFeatureFlag` for tools/skills (`DynamicToolsSettings`, `ChatPromptSkillsButton`)
- Voice: `userData.stt_support`
- Per-chat image gen: `ChatConfigImageGeneration` ↔ `currentChat.enableImageGeneration`
- MCP / settings tabs: `useFeatureFlag` / `isConfigItemEnabled` from `GET v1/config` — **not** the chosen backend approach for 7070

### Architecture and Layers Affected

**Frontend (this run):**
- Types: `assistant.ts` (`Assistant`, `CreateAssistantDto`), possibly `conversation.ts` / chat mapping if flag must live on `assistantData`
- Store/DTO: `store/assistants.ts`, `store/utils/assistants.ts` (`transformAssistantToCreateDTO`)
- Settings UI: `AssistantForm` (+ Yup, `compareFormData`); optionally project modal once BE exposes field
- Chat capability: extend `useAssistantFeatures` (or parallel check) so `fileAttachment` is false when any selected assistant (and ideally owning project) has `file_attachment_enabled === false`
- Chat surfaces: `ChatPrompt` (already conditional), `ChatUserMessage` edit attach, paste/`onAddFiles` wiring, workflow popups that reuse `ChatPromptFileUpload`
- Optional: graceful handling of 403 `"File attachment not allowed"` in `chatGeneration` / upload error UX

**Backend (already done; FE must align):**
- Models + migration + assistant CRUD + chat validators
- Project column enforced at chat time but not exposed on Projects HTTP API

### Integration Points

- **Contract to consume:** `file_attachment_enabled` on assistant detail GET / create / update (`null`|`true`|`false`). Treat `null`/`true` as enabled; `false` as disabled.
- **Chat visibility data source:** today chat only has slim `AssistantData` (type-driven). FE must either (a) fetch/cache full assistant detail and merge flag into feature computation, (b) extend conversation `assistant_data` backend payload to include the flag (would need BE follow-up), or (c) load assistants from `assistants` store by id when opening chat.
- **Admin write path:** assistant form Switch → DTO → `PUT/POST /v1/assistants` (ready on BE).
- **Project write path:** not ready for UI until Projects API + FE types/store updated.
- **Server enforcement remains source of truth:** even if UI hides controls, chat with `file_names` 403s when disabled — UI should prevent initiation and ideally map the known error.
- **Multi-assistant chats:** existing AND-reduction for AgentCore suggests “any disabled → hide attach”; confirm product intent vs “all must disable”.
- **Upload still hits `v1/files/bulk` before chat:** hiding button alone is insufficient for AC “no uploads initiated” if paste/drop/edit-attach remain active — must gate all initiation paths.

### Patterns and Conventions

- Per-assistant boolean capability: backend `Optional[bool]` on `AssistantRequest`/`AssistantBase` + FE form Switch + DTO mapper + `compareFormData` — exact precedent: `enable_image_generation`, `smart_tool_selection_enabled`, interactive features.
- Chat toolbar hide-vs-disable: prefer **hide** (`&&` / `return null`) like skills/tools when capability off; `disabled={!!isInProgress}` is for transient generation state only.
- Do **not** add `FEATURE_FLAGS` / `features:chatFileAttachment` — abandoned on backend; would diverge from shipped API.
- Valtio store pattern: assistant CRUD stays in `assistants` store; chat generation stays in `chatGeneration` store.
- Forms: react-hook-form + Yup + `FormAccordion` / Switch.

---

## 3. Documentation Findings

### Guides and Architecture Docs

**Frontend `.ai-run/guides/` (relevant):**
- `development/api-integration.md` — store-pattern API calls
- `patterns/state-management.md` — valtio domain stores
- `patterns/form-patterns.md` — assistant form conventions
- `components/component-patterns.md` — chat component placement

**Backend (reference only for FE contract):**
- Backend task artifacts: `codemie/docs/superpowers/tasks/2026-08-10-disable-attach-file-button/` (`plan.md`, QA report, prior technical analysis of abandoned config-flag approach)
- Plan explicitly: *“Scope: backend only. No frontend changes. No customer-level feature flag.”*

### Architectural Decisions

- Shipped decision: **per-assistant and per-project nullable boolean** `file_attachment_enabled`, enforced at chat request when `file_names` present.
- Explicit non-decision for FE: customer-config `features:chatFileAttachment` was researched then abandoned.
- Default `None` means allowed (opt-out disable), matching other optional assistant toggles’ “unset = legacy behavior”.

### Derived Conventions

- Admin toggle belongs on **AssistantForm** next to image generation / interactive features, not under Settings → customer config.
- Chat runtime should reuse **`useAssistantFeatures.fileAttachment`** (extend sources) rather than inventing a second parallel gate in `ChatPrompt` only.
- Project-level admin UX is a **follow-up** until Projects API exposes the column (DB + chat enforcement already exist).

---

## 4. Testing Landscape

### Existing Coverage

**Frontend:**
- `src/hooks/__tests__/useFileUpload.test.tsx` — upload limits, picker, remove, errors (strong)
- `src/pages/chat/hooks/__tests__/useAssistantFeatures.test.ts` — `fileAttachment` false only for AgentCore; defaults true
- `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx` — mocks away `ChatPromptFileUpload` / `useFileUpload` (no attach visibility assertions)
- `ChatPrompt.scrollbar.test.tsx` — hardcodes `fileAttachment: false`, mocks upload UI
- `src/components/__tests__/File.test.tsx` — file chip UI
- Workflow popups: assert Attach button via stubbed `ChatPromptFileUpload`
- **No** `ChatPromptFileUpload.test.*`; **no** Cypress/Playwright e2e for attach

**Backend (already green for this feature):**
- `tests/unit/routers/test_assistant_file_attachment.py` — validator matrix (assistant/project disabled, passthrough)

### Testing Framework and Patterns

- Vitest + Testing Library; unit vs integration workspaces; mock stores in unit tests; `mockAPI()` for integration.
- Local file helpers: `createMockFile` in `useFileUpload` tests; inline `vi.mock` for upload hook/component.

### Coverage Gaps (frontend work)

- No ChatPrompt test: Attach hidden when `fileAttachment === false` / shown when true (without mocking the button away)
- No tests that `file_attachment_enabled === false` from assistant payload drives the gate
- Paste / Editor `onAddFiles` not asserted off when attachments disabled
- `ChatUserMessage` edit Attach File untested for the gate
- AssistantForm Switch + DTO include `file_attachment_enabled` untested
- `filesStore.uploadFiles` store path lightly covered
- No e2e for admin disable → chat hide → blocked upload

---

## 5. Configuration and Environment

### Environment Variables

- No new `VITE_*` env var required for this feature.
- Backend enforcement is data-driven (`file_attachment_enabled` columns), not env-gated.

### Configuration Files

- Do **not** add `customer-config.yaml` / `FEATURE_FLAGS` entry for chat file attachment (conflicts with completed backend design).
- Mock-server (`mock-server/db.json`): extend assistant fixtures with `file_attachment_enabled` for local UI testing once types exist.
- Alembic migration already in backend repo; FE deploy needs backend migration applied in target envs.

### Feature Flags and Deployment Concerns

- Runtime flag source for UI: **assistant (and later project) entity field**, not `GET /v1/config`.
- Helm/customer-config changes: none for this ticket’s chosen design.
- Compatibility: older backends without the field → treat missing/`undefined` like `null` (attachments allowed).
- List endpoints omit the field — detail-fetch or enriched conversation payload required for accurate chat gating without N+1 surprises.

---

## 6. Risk Indicators

1. **Chat `AssistantData` lacks the flag** — current chat context only carries assistant `type` for feature gating; without enriching conversation payload or fetching detail, UI cannot hide Attach based on `file_attachment_enabled` and users will hit 403 after selecting files.
2. **Incomplete initiation surface coverage** — toolbar is gated, but paste (`useFilePaste`), Quill image drop/paste (`onAddFiles`), and `ChatUserMessage` edit “Attach File” are not; AC “no file uploads can be initiated” fails if only the paperclip is hidden.
3. **Workflow / continue-with-input reuse** — `ContinueWithInputPopup` and workflow start popups mount `ChatPromptFileUpload` outside `ChatPrompt`’s `assistantFeatures` gate; may still allow attach when assistant/project disables it (and backend workflow path may still bypass validator — known BE deferred CR).
4. **Project-level admin gap** — DB + chat 403 for project `False` exist, but Projects API/UI types omit the field; ticket scenarios mentioning “project” config cannot be fully satisfied in FE-only scope without BE API follow-up.
5. **Multi-assistant AND semantics** — unclear whether one disabled assistant in a multi-assistant chat should hide attach for all; wrong choice causes either false 403s or surprising visible button.
6. **Pre-chat upload race** — `v1/files/bulk` may succeed before chat 403; UX can leave orphan uploads / confusing errors unless UI gates early and maps the known 403 message.
7. **Weak UI test safety net** — Attach visibility is mocked out of ChatPrompt tests; regressions of hide/show and form persistence are easy without new tests.
8. **List vs detail asymmetry** — assistant list responses omit `file_attachment_enabled`; any UI that only has list data will show Attach incorrectly until detail is loaded.
9. **codegraph MCP unavailable** — research used filesystem exploration (five parallel Explore threads across UI attach surfaces, backend flag/API, tests, enable/disable patterns, and settings surfaces).

---

## 7. Summary for Complexity Assessment

Frontend scope is a **medium, contract-driven wiring** task: consume backend `file_attachment_enabled` (nullable bool; `false` disables), expose an admin Switch on `AssistantForm` (same pattern as `enable_image_generation`), thread the field through `Assistant` / `CreateAssistantDto` / `transformAssistantToCreateDTO` / `compareFormData`, and extend chat gating so Attach is hidden when disabled.

The chat side is larger than a one-line `ChatPrompt` change: `useAssistantFeatures` today only understands assistant **type** (AgentCore), and chat `AssistantData` does not carry the new field — a data-plumbing decision is required (detail fetch, store merge, or backend-enriched `assistant_data`). Acceptance criteria also require disabling **all** upload initiation paths (toolbar, paste, image drop, edit-message attach, and ideally workflow popups), not only the paperclip.

Project-level configuration is only partially deliverable on FE until Projects REST DTOs expose the column; chat-time 403 for project disable already works server-side. Do not introduce a `v1/config` feature flag — that approach was abandoned on the backend.

Test work should extend `useAssistantFeatures` (or successor) unit tests, add ChatPrompt visibility tests that do not mock away `ChatPromptFileUpload`, cover AssistantForm persistence, and assert paste/edit paths respect the flag. Backend validator tests already exist and define the contract FE must honor (`null`/`true` allow; `false` → 403 `"File attachment not allowed"`).
