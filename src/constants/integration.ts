// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { StatusEnum, StatusType } from '@/components/StatusBadge/StatusBadge'
import { FEATURE_FLAGS } from '@/constants/featureFlags'

export enum IntegrationOption {
  USER = 'User',
  PROJECT = 'Project',
}

export const GOOGLE_OAUTH_CREDENTIAL_TYPE = 'googleoauth'
export const SHAREPOINT_CREDENTIAL_TYPE = 'sharepoint'

/** Values match the `auth_type` stored on the SharePoint integration. */
export const SHAREPOINT_AUTH_METHODS = {
  OAUTH: 'oauth',
  APP: 'app',
} as const

export const SHAREPOINT_AUTH_METHOD_OPTIONS = [
  { label: 'Sign in with Microsoft', value: SHAREPOINT_AUTH_METHODS.OAUTH },
  { label: 'Azure app registration', value: SHAREPOINT_AUTH_METHODS.APP },
]

export const GITLAB_OAUTH_CREDENTIAL_TYPE = 'gitlaboauth'
export const JIRA_OAUTH_CREDENTIAL_TYPE = 'jiraoauth'
export const CONFLUENCE_OAUTH_CREDENTIAL_TYPE = 'confluenceoauth'

// EPMCDME-14586/14587: value of the auth_type marker stored in credential_values that flags a base
// Jira/Confluence/Git integration as OAuth-authenticated (folded model).
export const OAUTH_AUTH_TYPE = 'oauth'

// Credential types whose OAuth variant is folded into the base type's form via an in-form
// toggle instead of appearing as its own item in the credential-type select. EPMCDME-14586: GitLab
// OAuth reuses the existing Git integration type (only GitLab has OAuth on Git).
export const OAUTH_VARIANT_BY_BASE_TYPE: Record<string, string> = {
  jira: JIRA_OAUTH_CREDENTIAL_TYPE,
  confluence: CONFLUENCE_OAUTH_CREDENTIAL_TYPE,
  git: GITLAB_OAUTH_CREDENTIAL_TYPE,
}

// OAuth-variant credential types that are hidden from the credential-type select (their base
// type surfaces them through the toggle instead).
export const OAUTH_VARIANT_CREDENTIAL_TYPES: ReadonlySet<string> = new Set(
  Object.values(OAUTH_VARIANT_BY_BASE_TYPE)
)

// EPMCDME-14587: OAuth variant credential type -> the runtime feature flag (env-driven, delivered on
// GET /v1/config) that gates whether that provider's OAuth sign-in is offered in the UI.
export const OAUTH_VARIANT_FEATURE_FLAG: Record<string, string> = {
  [GITLAB_OAUTH_CREDENTIAL_TYPE]: FEATURE_FLAGS.GITLAB_OAUTH,
  [JIRA_OAUTH_CREDENTIAL_TYPE]: FEATURE_FLAGS.JIRA_OAUTH,
  [CONFLUENCE_OAUTH_CREDENTIAL_TYPE]: FEATURE_FLAGS.CONFLUENCE_OAUTH,
}

// EPMCDME-14587: human-readable provider name for the OAuth variant, used to name the sign-in toggle.
// GitLab is the only OAuth provider under the shared Git type, so naming it disambiguates the toggle.
export const OAUTH_VARIANT_PROVIDER_LABEL: Record<string, string> = {
  [GITLAB_OAUTH_CREDENTIAL_TYPE]: 'GitLab',
  [JIRA_OAUTH_CREDENTIAL_TYPE]: 'Jira',
  [CONFLUENCE_OAUTH_CREDENTIAL_TYPE]: 'Confluence',
}

// Reverse lookup: OAuth variant type -> its base type (e.g. 'jiraoauth' -> 'jira').
export const getBaseTypeForOAuthVariant = (type: string): string | undefined =>
  Object.keys(OAUTH_VARIANT_BY_BASE_TYPE).find((base) => OAUTH_VARIANT_BY_BASE_TYPE[base] === type)

// EPMCDME-14584/14586/14587: a folded OAuth integration persists under its base type carrying an
// auth_type=oauth marker in credential_values. This is the single check for "is this OAuth".
export const isFoldedOAuth = (credentialValues?: Record<string, unknown>): boolean =>
  credentialValues?.auth_type === OAUTH_AUTH_TYPE

// Resolve the OAuth variant key ('gitlaboauth' | 'jiraoauth' | 'confluenceoauth') from either an
// already-variant credentialType (create flow / in-form footer, where the form's credentialType is
// the variant key) or a base type (git/jira/confluence) carrying the auth_type=oauth marker (edit
// flow, where the saved setting's credential_type is the base type). undefined => not OAuth.
export const resolveOAuthVariant = (
  credentialType: string,
  credentialValues?: Record<string, unknown>
): string | undefined => {
  const type = credentialType?.toLowerCase()
  if (OAUTH_VARIANT_CREDENTIAL_TYPES.has(type)) return type
  const variant = OAUTH_VARIANT_BY_BASE_TYPE[type]
  return variant && isFoldedOAuth(credentialValues) ? variant : undefined
}

export const INTEGRATION_STATE_ENABLED = 'Enabled'
export const INTEGRATION_STATE_DISABLED = 'Disabled'

export const INTEGRATION_ENABLED_BADGE_MAP: Record<
  string,
  { text: string; statusEnum: StatusType }
> = {
  enabled: { text: INTEGRATION_STATE_ENABLED, statusEnum: StatusEnum.Success },
  disabled: { text: INTEGRATION_STATE_DISABLED, statusEnum: StatusEnum.NotStarted },
}
