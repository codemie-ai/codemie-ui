# Code review — 2026-08-31-epmcdme-8503-conversation-starters-semantic-list (2026-08-31)

**request-changes** · confidence: low · 3 blocking · 0 deferred · 0 filtered as noise
Coverage: blind — n/a (compact profile) · edge-case ✓ · acceptance — n/a (no spec) · verification-gap — n/a (compact profile)  (1/1 dispatched lenses ran)

No-spec round: no story or spec ArtifactRef was found; acceptance lens was not dispatched; confidence capped at low.

## Look here first

- `src/pages/assistants/__tests__/AssistantDetailsPage.integration.test.tsx:113` — [other: test robustness] non-null assertion on closest('div') hides real failures — CR-001
- `src/pages/assistants/components/AssistantDetails/components/ConversationStarters.tsx:21` — [infra] whitespace-only items bypass empty guard and render blank pills — CR-002
- `src/pages/assistants/components/AssistantDetails/components/ConversationStarters.tsx:28` — [infra] duplicate item text produces React key collision — CR-003

## Checked and clean

No standards review (standards_expected: false for this profile).
