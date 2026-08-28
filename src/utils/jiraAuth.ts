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

export interface JiraConnectRequired {
  settingId: string
  integrationName: string
}

/**
 * Detects the structured "connect your Jira account" signal a run emits when the acting user has
 * no token for a shared Jira integration:
 *   { error: 'jira_auth_required', setting_id, integration_name }
 * Returns the normalized target, or null for any unrelated payload.
 */
export const parseJiraConnectRequired = (value: unknown): JiraConnectRequired | null => {
  if (
    typeof value !== 'object' ||
    value === null ||
    (value as { error?: unknown }).error !== 'jira_auth_required' ||
    typeof (value as { setting_id?: unknown }).setting_id !== 'string'
  ) {
    return null
  }
  const payload = value as { setting_id: string; integration_name?: unknown }
  const integrationName =
    typeof payload.integration_name === 'string' && payload.integration_name
      ? payload.integration_name
      : 'Jira integration'
  return { settingId: payload.setting_id, integrationName }
}

export const isJiraConnectRequired = (value: unknown): boolean =>
  parseJiraConnectRequired(value) !== null
