# Code review — 2026-08-28-frontend-handoff-epmcdme-14111-teams-integrations (2026-09-02)

**request-changes** - confidence: low - 9 blocking - 0 deferred - 7 filtered as noise
Coverage: blind OK, edge-case OK, verification-gap OK, acceptance n/a (no spec) (3/4 lenses ran)
No spec/story artifact was present, so acceptance-criteria coverage could not run - the "clean" areas below are unchecked against any requirement, not confirmed against one.

## Look here first

- src/pages/integrations/components/SettingsForm/SettingsForm.tsx:382 - [other: data-scoping] project change clears resource_id but not assistant_ids, leaving stale assistant selections attached to the new project - CR-005
- src/pages/integrations/components/SettingsForm/CredentialFields.tsx:354 - [other: data-scoping] assistant multi-select has no project guard, so assistants can be picked before any project is chosen - CR-004
- src/pages/integrations/components/SettingsForm/CredentialFields.tsx:126 - [infra] both CredentialFields instances (top + fieldsSection) fire the assistant fetch, doubling every request - CR-001
- src/pages/integrations/components/SettingsForm/CredentialFields.tsx:151 - [other: pagination] hardcoded 100-item cap with no pagination; selections outside the page render as raw ids - CR-002
- src/types/entity/setting.ts:18 - [other: type-safety] credential value types widened to unknown, backed by two unchecked casts in SettingsForm.tsx - CR-008

## Also flagged

- src/pages/integrations/components/SettingsForm/CredentialFields.tsx:349 - [other: test-gap] no test covers the assistantMultiSelect branch (resourceType, perPage, onChange shape) - CR-003
- src/utils/settings.ts:79 - [other: test-gap] no test covers the featureFlag gate that hides/shows msteams - CR-009
- src/pages/integrations/components/SettingsForm/hooks/useResourceOptions.ts:70 - [other: error-handling] a failed assistant fetch is swallowed with no error UI - CR-007
- src/pages/integrations/components/SettingsForm/SettingsForm.tsx - [infra] SettingsForm.tsx (731), CredentialFields.tsx (409), ProjectSettings.tsx (305) touched again without extraction toward the 300-line guide - CR-006

## Checked and clean

commit-format PASS, security PASS, code-quality UNVERIFIED (partial - oversized files not extracted, one || used instead of ??)
