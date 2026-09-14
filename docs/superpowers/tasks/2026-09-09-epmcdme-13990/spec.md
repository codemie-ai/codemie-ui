# Spec: Sharepoint Integration — Reorder and Rename Credential Fields (EPMCDME-13990)

## Problem

When creating a Sharepoint Integration (the "Azure app registration" auth method), the four
credential fields are shown in an order that doesn't match the natural setup flow, and their
wording ("Azure AD Application (Client) ID", "Azure AD Tenant ID", "Azure AD Client Secret") is
inconsistent with the wording shown for the same concepts when configuring a Sharepoint
Datasource. This causes copy-paste errors during setup.

## Solution

Reorder and relabel the four fields in `CREDENTIAL_UI_MAPPING.sharepoint.fields`
(`src/utils/settingsUIConfig.ts:720-748`), the single config object that `CredentialFields.tsx`
renders in declaration order — no rendering-logic change needed
(`src/pages/integrations/components/SettingsForm/CredentialFields.tsx:362-397`). This config is
the single source consumed both by the standalone Integrations page and by the "create
integration inline" flow inside the Sharepoint Datasource form (`IntegrationSection.tsx` →
`NewIntegrationPopup` → `SettingsForm`), so one edit covers both surfaces.

New declared key order: `url`, `tenant_id`, `client_id`, `client_secret`.

Target label text — each field must carry an explicit `label`. **Discovered during
implementation:** `getLabel()` (`CredentialFields.tsx:167-171`) truncates at the first `(`
regardless of whether it is called on an explicit `label` or a derived placeholder — line 248's
`label={getLabel(label ?? placeholder)}` runs the heuristic unconditionally, so even an explicit
`label` value is clipped to "Azure Directory" / "Azure Application". Rendering the exact target
text is impossible without a one-line precedence fix in `CredentialFields.tsx:248`, changing it to
`label={label ?? getLabel(placeholder)}` so an explicit `label` bypasses the heuristic entirely,
while a derived-from-placeholder label still gets truncated as before. This narrow fix is in
scope (see revised Non-goals below):

- `url`: "URL" (unchanged)
- `tenant_id`: "Azure Directory (tenant) ID" — matches the Sharepoint Datasource form's
  `OAUTH_CUSTOM` wording exactly (`IndexTypeSharePoint.tsx:208-243`, field `sharepointTenantId`)
- `client_id`: "Azure Application (client) ID" — matches the same Datasource form's
  `sharepointCustomClientId` wording exactly
- `client_secret`: "Client Secret" — no Datasource-form equivalent exists to match (its
  OAuth-custom flow authenticates via sign-in, not a stored secret), so this uses the ticket's own
  literal wording

Existing `placeholder`, `help`, `sensitive`, and default-value behavior for each field carry over
unchanged; only `label` (and, where it currently duplicates the old wording, `placeholder`) is
touched.

## Acceptance Criteria

- Sharepoint Integration form (Azure app registration method) renders fields in this order: URL,
  Tenant ID, Application (Client) ID, Client Secret.
- Rendered *label* text (not just placeholder) is exactly: "URL", "Azure Directory (tenant) ID",
  "Azure Application (client) ID", "Client Secret".
- Both the standalone Integrations page and the "create integration inline" flow inside the
  Sharepoint Datasource form show the identical order and wording (single shared config, no
  divergence between the two entry points).
- A regression test asserts the rendered field order and exact label text for the four fields,
  since no existing test pins either today.

## Non-goals

- The Sharepoint Datasource form's `OAUTH_CUSTOM` fields (`IndexTypeSharePoint.tsx:208-243`) are
  not changed — neither their wording nor their `client_id`-before-`tenant_id` order. They are the
  naming reference for this change, not a target of it.
- No new shared constant/module is introduced to centralize these label strings across the two
  forms; each remains an inlined literal, consistent with every other credential type in
  `settingsUIConfig.ts`.
- No change to `CredentialFields.tsx`'s rendering/grouping logic, to the `CredentialFieldConfig`
  type shape, or to any other credential type's field set — **except** the one-line label
  precedence fix at line 248 (`label={label ?? getLabel(placeholder)}`), added after
  implementation showed the original text-truncation goal was otherwise unreachable. This fix only
  changes behavior for fields that set an explicit `label`; all other credential types keep their
  current derived-placeholder labels unchanged.
- No change to placeholder-derived help links, `sensitive`-masking behavior, or the
  `dynPlaceholder`/`dynDefault` wiring for these fields.
- No visual/layout redesign of the credential form beyond the field order itself.

## Testing

Extend `src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.sharePointAuth.test.tsx`
(existing pattern: mocks `getCredentialUIMapping` while re-exporting the real
`CREDENTIAL_UI_MAPPING`) with an assertion on rendered field order (e.g., DOM order of labels or
textboxes) and exact label text for the four "Azure app registration" fields.

## Risks

The two Jira screenshot attachments that would have shown the ticket author's original
before/after view of both forms are unavailable in this repository. This spec resolves the
resulting wording ambiguity via an explicit stakeholder decision (see `decisions` in the stage
digest) rather than visual confirmation against the ticket's source screenshots.
