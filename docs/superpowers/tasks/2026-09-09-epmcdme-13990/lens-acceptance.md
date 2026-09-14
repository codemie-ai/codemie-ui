```json
[
  {"kind":"acceptance","item":"Sharepoint Integration form (Azure app registration) renders fields in order: URL, Tenant ID, Application (Client) ID, Client Secret","status":"pass","notes":"src/utils/settingsUIConfig.ts:729-748 declares sharepoint.fields in url, tenant_id, client_id, client_secret order; CredentialFields.tsx renders via Object.entries in declaration order."},
  {"kind":"acceptance","item":"Rendered label text is exactly URL / Azure Directory (tenant) ID / Azure Application (client) ID / Client Secret","status":"pass","notes":"Explicit label set per field (settingsUIConfig.ts:730,735,740,745) plus the label={label ?? getLabel(placeholder)} precedence fix in CredentialFields.tsx:248 makes explicit labels bypass the parenthesis-truncating heuristic."},
  {"kind":"acceptance","item":"Standalone Integrations page and the inline create-integration flow inside the SharePoint Datasource form show identical order/wording (single shared config)","status":"pass","notes":"Both entry points render the same CredentialFields component: NewIntegrationPopup.tsx imports SettingsForm, which renders CredentialFields against the single CREDENTIAL_UI_MAPPING.sharepoint config; no second/divergent config exists."},
  {"kind":"acceptance","item":"A regression test asserts rendered field order and exact label text for the four fields","status":"pass","notes":"SettingsForm.sharePointAuth.test.tsx adds 'renders the Azure app registration fields in URL, Tenant ID, Client ID, Secret order with matching labels', asserting DOM order and exact text of all four labels."}
]
```

- (none — all criteria pass on diff/code evidence)
