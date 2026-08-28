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

// Credential types whose OAuth variant is folded into the base type's form via an in-form
// toggle instead of appearing as its own item in the credential-type select. GitLab OAuth is
// intentionally excluded — it has no shared base type and stays a standalone credential type.
export const OAUTH_VARIANT_BY_BASE_TYPE: Record<string, string> = {
  jira: JIRA_OAUTH_CREDENTIAL_TYPE,
  confluence: CONFLUENCE_OAUTH_CREDENTIAL_TYPE,
}

// OAuth-variant credential types that are hidden from the credential-type select (their base
// type surfaces them through the toggle instead).
export const OAUTH_VARIANT_CREDENTIAL_TYPES: ReadonlySet<string> = new Set(
  Object.values(OAUTH_VARIANT_BY_BASE_TYPE)
)

// Reverse lookup: OAuth variant type -> its base type (e.g. 'jiraoauth' -> 'jira').
export const getBaseTypeForOAuthVariant = (type: string): string | undefined =>
  Object.keys(OAUTH_VARIANT_BY_BASE_TYPE).find((base) => OAUTH_VARIANT_BY_BASE_TYPE[base] === type)

export const INTEGRATION_STATE_ENABLED = 'Enabled'
export const INTEGRATION_STATE_DISABLED = 'Disabled'

export const INTEGRATION_ENABLED_BADGE_MAP: Record<
  string,
  { text: string; statusEnum: StatusType }
> = {
  enabled: { text: INTEGRATION_STATE_ENABLED, statusEnum: StatusEnum.Success },
  disabled: { text: INTEGRATION_STATE_DISABLED, statusEnum: StatusEnum.NotStarted },
}
