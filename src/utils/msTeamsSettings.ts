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

import { ProjectSetting, SettingCredentialValue } from '@/types/entity/setting'

// No separator, matching every other multi-word internal key (azuredevops, servicenow,
// sharepoint, ...) — SettingsForm derives this key from the backend's credential_type via
// `.toLowerCase()`, so it must equal `serverEnum.toLowerCase()` for edit mode to resolve it.
export const MS_TEAMS_CREDENTIAL_TYPE = 'msteams'
export const ASSISTANT_IDS_KEY = 'assistant_ids'

export const buildMsTeamsCredentialValues = (assistantIds: string[]): SettingCredentialValue[] => [
  { key: ASSISTANT_IDS_KEY, value: assistantIds },
]

export const readAssistantIdsFromSetting = (
  setting: Pick<ProjectSetting, 'credential_values'>
): string[] => {
  const entry = setting.credential_values.find((value) => value.key === ASSISTANT_IDS_KEY)
  return Array.isArray(entry?.value) ? entry.value : []
}
