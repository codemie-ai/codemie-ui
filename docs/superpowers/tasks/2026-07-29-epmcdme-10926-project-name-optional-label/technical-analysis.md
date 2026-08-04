# Technical Research

**Task**: credentials azuredevops form label optional settingsUIConfig
**Generated**: 2026-07-29T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

In the Jira ticket EPMCDME-10926, the AzureDevOps credential form's "Project Name" field should be labeled as "Project Name (optional)" to indicate that it is not required. This change is purely a label/display change — no validation or underlying logic should change. The project field already has no Yup validation (it is optional). We need to add a `label` property to the `project` field entry in the `azuredevops` section of the `CREDENTIAL_UI_MAPPING` in `settingsUIConfig.ts`, and add a corresponding unit test assertion.

---

## 2. Codebase Findings

### Existing Implementations

- `C:\EPAM\codemie\codemie-dev\codemie-ui\src\utils\settingsUIConfig.ts` — defines `CREDENTIAL_UI_MAPPING`; the `azuredevops.project` field is currently `{ placeholder: 'Project Name' }` with no `label` property
- `C:\EPAM\codemie\codemie-dev\codemie-ui\src\pages\integrations\components\SettingsForm\CredentialFields.tsx` — consumes `CREDENTIAL_UI_MAPPING` to render credential form fields; destructures `label` and `placeholder` from each field config

### Architecture and Layers Affected

- **UI / Presentation layer**: `CredentialFields.tsx` — renders the credential form; the `label` property from config is passed directly to the `Input` component as `label={getLabel(label ?? placeholder)}`
- **Configuration / Data layer**: `settingsUIConfig.ts` — single source of truth for all credential field UI metadata (placeholder, label, validation, component type)

### Integration Points

- `getLabel` helper in `CredentialFields.tsx` (lines 71–75) — transforms raw label/placeholder strings before passing to `Input`. It strips everything after `(`, after `,`, and after `e.g.`, and removes the text `"Optional field"`. **This function will strip `(optional)` from any string containing a parenthesis**, so setting `label: 'Project Name (optional)'` currently produces a rendered label of `"Project Name"` — not the intended output.
- `Input` component (from the design system) — receives the final `label` string after `getLabel` transformation

### Patterns and Conventions

- All `CredentialComponentType.input` fields use `getLabel(label ?? placeholder)` to derive the rendered label. If `label` is set on the field config, it takes precedence over `placeholder`; otherwise `placeholder` is used.
- Many fields use a `label` property for a human-readable override distinct from the `placeholder` (e.g. `azuredevops.url` has `label: 'Hostname'`, `email.oauth_from_email` has `label: 'Email address to send from'`). All existing `label` values are plain strings with no parentheticals — none currently test the `(` split behavior.
- `CredentialComponentType.textarea`, `.select`, and `.multiselect` have different label rendering paths; this change only affects the `input` type.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No guides found specifically covering the credential form label rendering pipeline. Conventions derived from code exploration.

### Architectural Decisions

- No ADRs found for this domain inline or in docs.
- The `getLabel` stripping logic (split on `(`) appears to have been designed to clean up `e.g.` placeholder patterns like `"Host URL (e.g. https://...)"` — a side effect is that any parenthetical suffix is also stripped.

### Derived Conventions

- UI field metadata lives exclusively in `settingsUIConfig.ts` (`CREDENTIAL_UI_MAPPING`); components must not hardcode labels.
- `label` overrides `placeholder` for rendered label text in `input`-type fields.
- `getLabel` is the single transformation point; any change to label rendering behavior should be made there.

---

## 4. Testing Landscape

### Existing Coverage

- `C:\EPAM\codemie\codemie-dev\codemie-ui\src\pages\integrations\components\SettingsForm\__tests__\CredentialFields.test.tsx` — contains `describe('azuredevops credential fields')` block (approx. lines 418–456) that covers:
  - Field order (url, organization, project, token)
  - URL label is `'Hostname'`
  - URL required validation message is `'Hostname is required'`
  - `organization` validation
  - `token` validation
  - `project` has `validation === undefined` (i.e. is optional)
- `C:\EPAM\codemie\codemie-dev\codemie-ui\src\utils\__tests__\settings.test.ts` — tests URL defaults, placeholders, and other CREDENTIAL_UI_MAPPING properties

### Testing Framework and Patterns

- **Framework**: Vitest (`vitest run`)
- **Libraries**: `@testing-library/react`, `vitest` (`describe`, `it`, `expect`, `vi`)
- Tests access `CREDENTIAL_UI_MAPPING` directly and assert on individual field properties (`.label`, `.placeholder`, `.validation`)

### Coverage Gaps

- No existing test asserts `azuredevops.project.label` — this assertion must be added as part of this ticket.
- No test covers the `getLabel` function's behavior with parenthetical suffixes like `(optional)`.

---

## 5. Configuration and Environment

### Environment Variables

None identified as relevant to this change.

### Configuration Files

- `C:\EPAM\codemie\codemie-dev\codemie-ui\src\utils\settingsUIConfig.ts` — governs all credential form field UI metadata

### Feature Flags and Deployment Concerns

None identified. This is a pure UI label change with no backend, API, or deployment surface.

---

## 6. Risk Indicators

- **`getLabel` strips parentheticals**: The helper function in `CredentialFields.tsx` splits the label string on `(` and discards everything after. Setting `label: 'Project Name (optional)'` will render as `"Project Name"` — the `(optional)` text will be silently dropped. This is the primary risk. The fix requires either: (a) modifying `getLabel` to preserve a trailing `(optional)` suffix, or (b) using a label string without parentheses (e.g. `"Project Name — optional"`, though this does not match the ticket specification).
- **No existing test for `project` field label**: The gap is documented above; a new assertion must be added.
- **`getLabel` is shared across all credential field types**: Any change to `getLabel`'s splitting logic could affect rendering of other fields. The change must be targeted and not break existing labels that contain commas or `e.g.` patterns.
- **Requirements clarity**: The ticket specifies the exact string `"Project Name (optional)"`. If `getLabel` is not modified, the displayed label will not match this specification.

---

## 7. Summary for Complexity Assessment

This task touches two layers: the UI Configuration layer (`settingsUIConfig.ts`) and the Presentation layer (`CredentialFields.tsx`). The primary config change — adding `label: 'Project Name (optional)'` to `azuredevops.project` — is a one-line edit. However, a non-obvious blocker exists: the `getLabel` helper in `CredentialFields.tsx` strips all text after `(`, which means the `(optional)` suffix will be silently dropped and never reach the `Input` component. To fully satisfy the ticket, `getLabel` must be modified to preserve this suffix, or an alternative approach must be chosen. This makes the change slightly larger than a trivial one-liner: it involves a targeted fix to a shared utility function plus verification that no other field is broken.

The affected area has partial test coverage. The `azuredevops` describe block in `CredentialFields.test.tsx` exists and follows a clear pattern for asserting field properties, so adding the new label assertion is straightforward. No new test infrastructure is needed. A test for the `getLabel` function's handling of `(optional)` would also be prudent but is not strictly required.

Key risk factors: the `getLabel` stripping logic is shared and must not regress other fields; the fix is small but requires understanding an implicit rendering contract that is not documented. Overall complexity is low-to-medium — two files need edits (`settingsUIConfig.ts` and `CredentialFields.tsx`), one test file needs a new assertion, and the change has zero backend surface.
