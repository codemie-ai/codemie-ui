# Code review — restrict-llm-model-dropdown-zoo (2026-09-20)

**request-changes** · confidence: low · 20 blocking · 0 deferred · 0 filtered as noise

**Review incomplete**: Oversized diff exhausted reachability budget (edge-case findings unverified past 30 calls); blind and verification-gap lenses failed to dispatch. Commit format violations block CI.

Coverage: blind ✗ failed · edge-case ✓ · verification-gap ✗ failed · acceptance — n/a (no spec)

## Critical blockers

- `src/pages/chat/ChatPage.tsx:127` — [infra] getModelsForCurrentChat called on null projectId; no guard — CR-001
- `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx:146` — [infra] getLLMModels promise fetch fails silently; no error handler — CR-002
- `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx:158` — [infra] race condition on projectId change; stale model list displayed — CR-003
- `src/pages/settings/administration/projectsManagement/ProjectModelsSection.tsx:860` — [config] undefined projectName silently defaults to 'demo'; pollutes wrong project — CR-006
- `src/pages/settings/administration/projectsManagement/components/projectModelConfiguration.ts:5452` — [infra] API fetch failure treated as 'no restrictions'; disables filtering silently — CR-011

## Also flagged

- `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx:117` — [infra] defaultModel may be null when filtered list empty — CR-004
- `src/types/entity/conversation.ts:223` — [config] projectId absence meaning unclear; ambiguous null semantics — CR-005
- `src/pages/settings/administration/projectsManagement/ProjectModelsSection.tsx:895` — [config] all models marked disabled when restrictions absent; UI state invalid — CR-007
- `src/pages/settings/administration/projectsManagement/ProjectModelsSection.tsx:960` — [infra] saveChanges failure ignored; user navigated away with unsaved changes — CR-008
- `src/pages/settings/administration/projectsManagement/ProjectModelsSection.tsx:920` — [infra] useBlocker state machine deadlock; unsaved changes warning never shown — CR-009
- `src/pages/settings/administration/projectsManagement/ProjectModelsSection.tsx:947` — [config] disabling current default leaves Apply button stuck disabled — CR-010
- `src/pages/settings/administration/projectsManagement/components/projectModelConfiguration.ts:5456` — [config] empty allowed_models array semantics ambiguous; possible inversion — CR-012
- `src/pages/settings/administration/projectsManagement/AvailableModelsSection.tsx:3530` — [infra] API failure retry loop may infinite-loop if models change during retry — CR-013
- `src/pages/settings/administration/projectsManagement/AvailableModelsSection.tsx:3536` — [infra] uncaught JSON parse error during model fetch; component unmounts — CR-014
- `src/pages/settings/administration/projectsManagement/AvailableModelsSection.tsx:3564` — [infra] empty model list silently fails validation; no user error message — CR-015
- `src/pages/settings/administration/projectsManagement/AvailableModelsSection.tsx:3596` — [infra] confusing validation error message conflates API failure with 'no models' — CR-016
- `src/pages/settings/administration/projectsManagement/components/ModelConfigurationTable.tsx:4939` — [config] invalid model selection accepted; state mismatch — CR-017
- `src/store/projects.ts` — [infra] updateAllowedModels may not exist or endpoint 404; error not rolled back — CR-018
- `src/pages/settings/administration/projectsManagement/ProjectDetailsNavigation.tsx:3791` — [infra] navigation failure not caught; Models tab click fails silently — CR-019
- `src/pages/settings/administration/ProjectDetailsPage.tsx:3117` — [config] getActiveTab defaults to overview when route unknown; tab navigation broken — CR-020

## Checked and clean

security ✓ · commit-format ✗ blocked (5 commits violate format) · code-quality ? unverified (no guide)
