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

import { useMemo } from 'react'

import { FilterOption } from '@/types/filters'
import { getOriginalCredentialType } from '@/utils/settings'
import { CREDENTIAL_UI_MAPPING } from '@/utils/settingsUIConfig'

// Backend credential types that resolve to at least one tool (see the BE credential-type -> tool
// registry). Types without a tool (A2A, LiteLLM, SVN, FileSystem, MCP, ...) always return an empty
// list, so they are not offered. Plugin is included for the Assistant filter.
const SUPPORTED_INTEGRATION_TYPES = new Set([
  'AWS',
  'Azure',
  'AzureDevOps',
  'Confluence',
  'Elastic',
  'Email',
  'GCP',
  'Git',
  'Jira',
  'Keycloak',
  'Kubernetes',
  'OpenAPI',
  'Plugin',
  'ReportPortal',
  'SQL',
  'ServiceNow',
  'SharePoint',
  'Sonar',
  'Telegram',
  'XWiki',
  'Xray',
  'ZephyrScale',
])

/**
 * Role-agnostic hook that maps CREDENTIAL_UI_MAPPING keys to FilterOption[] for the integration
 * types the backend can resolve to a tool, deduplicated by backend value and sorted alphabetically.
 * No API calls, no user/role dependencies.
 * Use this as the source of options for the Assistant/Workflow integration_type search filter.
 */
export const useAllIntegrationTypeOptions = (): FilterOption[] => {
  return useMemo(() => {
    const byValue = new Map<string, FilterOption>()
    Object.keys(CREDENTIAL_UI_MAPPING).forEach((key) => {
      const value = getOriginalCredentialType(key)
      if (!SUPPORTED_INTEGRATION_TYPES.has(value) || byValue.has(value)) return
      byValue.set(value, { label: CREDENTIAL_UI_MAPPING[key]?.displayName || value, value })
    })
    return [...byValue.values()].sort((a, b) => a.label.localeCompare(b.label))
  }, [])
}
