# Technical Research

**Task**: scheduler cron integration settings form
**Generated**: 2026-09-15
**Research path**: filesystem

---

## 1. Original Context

Show human-readable cron preview in integration scheduler settings. When a user enters a cron expression and leaves the cron input field (on blur), display a human-readable explanation of the schedule. Also update the Schedule column in the schedulers view to show human-readable format instead of raw cron/ISO strings. Both create and edit integration flows need this. Invalid cron expressions should not show a valid preview. Existing one-hour scheduling restriction validation must remain.

---

## 2. Codebase Findings

### Existing Implementations

- `src/utils/cronValidator.ts` — contains `isValidCronExpression`, `isMoreFrequentThanHourly`, `validateCronExpression`, `getNextCronRun`, and `getCronDescription`. The `getCronDescription` function already uses `cronstrue.toString()` to produce human-readable text and falls back to preset labels. Both `cronstrue` (^3.21.0) and `cron-parser` (^5.6.0) are already installed in `package.json`.

- `src/pages/integrations/components/SettingsForm/CredentialFields.tsx` — generic field renderer that renders the `schedule` field for the scheduler integration type as a plain `CredentialComponentType.input`. This is the component that needs a new `cronInput` variant with on-blur preview rendering.

- `src/utils/settingsUIConfig.ts` (line 843–857) — defines the `scheduler.fields.schedule` field config including a Yup validation using `validateCronExpression`. The field `type` is not explicitly set, so it defaults to `CredentialComponentType.input`.

- `src/types/settingsUI.ts` — `CredentialComponentType` enum and `CredentialFieldConfig` type live here. A new `cronInput` entry can be added to the enum.

- `src/pages/schedulers/SchedulersPage.tsx` — contains `renderSchedulerSchedule` (lines 47–54) which already renders both `item.schedule.cron` (mono font) and `item.schedule.description` if it differs from the cron string. The `SchedulerSchedule` interface in `src/store/schedulers.ts` includes a `description: string` field returned by the backend.

- `src/components/form/CronScheduleInput/CronScheduleInput.tsx` — a separate, reusable cron-picker component used for datasource reindexing (not the integration scheduler form). It does not currently show a blur-triggered preview either, but it is not within the primary task scope.

- `src/pages/integrations/NewUserIntegrationPage.tsx` and `src/pages/integrations/EditUserIntegrationPage.tsx` — both render `<SettingsForm>` which delegates field rendering to `CredentialFields`. Editing/creating a Scheduler integration routes through these pages.

- `src/pages/integrations/EditProjectIntegrationPage.tsx` and `src/pages/integrations/NewProjectIntegrationPage.tsx` — same pattern as user integration pages but for project-scoped integrations.

### Architecture and Layers Affected

- **Form / Component layer** — `CredentialFields.tsx` must handle the new `cronInput` type to render an `Input` with an on-blur handler that computes and shows a human-readable preview beneath the field.
- **Type layer** — `CredentialComponentType` enum in `src/types/settingsUI.ts` needs a `cronInput` entry.
- **Config layer** — `src/utils/settingsUIConfig.ts`: the `scheduler.fields.schedule` field needs its `type` changed to `CredentialComponentType.cronInput`.
- **View layer** — `src/pages/schedulers/SchedulersPage.tsx`: `renderSchedulerSchedule` already shows `description` when it differs from `cron`. Task may want to flip the display to show description first or show description only. Needs design clarification but no new utility functions are required.

### Integration Points

- `getCronDescription` in `cronValidator.ts` is the ready-made function for producing the preview string.
- `isValidCronExpression` is used to gate whether the preview is shown (invalid expressions must show nothing).
- No API calls are involved — preview is entirely client-side.
- The `SchedulerSchedule.description` from the backend may already carry a human-readable string for the table column; that is independent of the form-level preview.

### Patterns and Conventions

- New field types in `CredentialFields` follow an `if (type === CredentialComponentType.X)` pattern rendering a different component. The new `cronInput` case should follow this pattern exactly.
- Field config is declared in `settingsUIConfig.ts` as a plain object; adding `type: CredentialComponentType.cronInput` there requires no changes outside the enum, config, and field renderer.
- React Hook Form `Controller` wraps all fields; the `onBlur` handler is available on `field.onBlur` from the render prop and can be merged with local state for the preview.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/components/component-patterns.md` — relevant for adding the new component variation.
- `.ai-run/guides/patterns/state-management.md` — relevant for local state in `CredentialFields`.
- `.ai-run/guides/development/api-integration.md` — not directly relevant (no new API calls).

### Architectural Decisions

- The `CredentialComponentType` enum is the established extension point for new field behaviors in the generic settings form — adding `cronInput` is in line with this pattern.
- Validation stays in Yup (inside `settingsUIConfig.ts`) — the on-blur preview is display-only and must not replace or duplicate the existing Yup validation.

### Derived Conventions

- Preview text must only appear when `isValidCronExpression(value)` returns true (and the value is non-empty).
- Local `useState` for the blur-triggered preview string is the right approach; no store or global state needed.
- The one-hour restriction validation in `validateCronExpression` must not be touched.

---

## 4. Testing Landscape

### Existing Coverage

- `src/utils/__tests__/cronValidator.test.ts` — unit tests for `isValidCronExpression`, `isMoreFrequentThanHourly`, `validateCronExpression`, and `getCronDescription`.
- `src/components/form/CronScheduleInput/__tests__/CronScheduleInput.test.tsx` — tests for the datasource cron picker component.
- `src/pages/schedulers/__tests__/SchedulersPage.integration.test.tsx` — integration tests for the schedulers table page.
- `src/pages/integrations/__tests__/IntegrationsPage.integration.test.tsx` — integration tests for the integrations table, but no coverage for the scheduler form fields.

### Testing Framework and Patterns

- Vitest with React Testing Library.
- Two Vitest projects: `unit` and `integration`.
- Mocks follow MSW-style patterns in integration tests.
- `userEvent.type` + `userEvent.tab` (or `fireEvent.blur`) used for input interaction tests.

### Coverage Gaps

- `CredentialFields.tsx` has no direct test file; the new `cronInput` rendering and blur-preview behavior will be uncovered.
- The integration scheduler form (create and edit) has no test covering the `schedule` field interaction.
- `SchedulersPage` schedule column rendering is untested for the human-readable `description` display path.

---

## 5. Configuration and Environment

### Environment Variables

None relevant — the feature is entirely client-side.

### Configuration Files

- `src/utils/settingsUIConfig.ts` — the `scheduler` config block at line 825 is the sole config point for the scheduler credential type fields.

### Feature Flags and Deployment Concerns

- The `src/pages/schedulers/` area is gated by a feature flag (`EPMCDME-15013` branch: `2026-09-15-epmcdme-15013-schedulers-feature-flag`). The cron preview feature lives within the same guarded surface, so no additional flag is needed.
- No deployment manifest changes required.

---

## 6. Risk Indicators

- `CredentialFields.tsx` has no test file — the new `cronInput` branch will ship without test coverage unless tests are written.
- The `SchedulerSchedule.description` field from the backend may or may not already carry a human-readable string; if it is empty or equals the cron string, the current `renderSchedulerSchedule` shows only the raw cron. The task says to show human-readable format; using `getCronDescription` client-side is a safe fallback.
- `cronstrue` throws for invalid input — `getCronDescription` already wraps the call defensively (checking `isValidCronExpression` first), but any direct call to `cronstrue.toString()` elsewhere must be similarly guarded.
- The `schedule` field in `settingsUIConfig.ts` does not set `type` explicitly, relying on the `CredentialComponentType.input` default. Changing it to `cronInput` requires verifying that `CredentialFields` falls through correctly when the type is unknown (it currently just renders nothing for unrecognized types).
- No `onBlur` prop is currently threaded through `CredentialFields` to the `Input` component; `field.onBlur` from React Hook Form's Controller render prop is available and must be used.

---

## 7. Summary for Complexity Assessment

The task touches three layers: the type enum (`settingsUI.ts`), the generic field renderer (`CredentialFields.tsx`), and the scheduler table page (`SchedulersPage.tsx`). The utility functions (`getCronDescription`, `isValidCronExpression`) are already implemented in `cronValidator.ts` and do not need modification. The cron libraries (`cronstrue`, `cron-parser`) are already installed. The total file change surface is small: approximately 4–5 files with localized edits — add a new enum value, add a new branch in `CredentialFields`, update the `settingsUIConfig` field type, and optionally adjust `SchedulersPage`'s schedule column rendering to show the description prominently.

The task follows established patterns: the `CredentialComponentType` enum is the well-worn extension point for new field types, and the `Controller` render-prop pattern for on-blur interaction is used throughout the form. No new patterns or libraries are introduced. The main decision the implementor must make is whether the schedulers table column should replace the cron string with description or display both — the existing renderer already shows both, so the change may be trivial (just reorder priority).

Test coverage is the primary risk area. `CredentialFields` has no dedicated test file, and the integration scheduler form is not integration-tested at the field level. If the task scope requires tests, the effort will be moderate: a unit test for the `cronInput` branch in `CredentialFields` and a smoke test for the schedulers table description rendering would be the minimum viable additions.
