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

import { MissingIntegrationByCredentialType } from '@/types/entity/assistant'

export interface FlattenedMissingIntegration {
  credential_type: string
  label: string
  toolkits: string[]
  tools: Array<{ toolkit: string; tool: string; label: string; credential_type: string }>
  sub_assistant_name?: string | null
  sub_assistant_id?: string
  sub_assistant_icon_url?: string | null
}

export const flattenMissingIntegrations = (
  missingByCredentialType: MissingIntegrationByCredentialType[],
  subAssistantsMissing: MissingIntegrationByCredentialType[]
): FlattenedMissingIntegration[] => {
  const allMissing = [...missingByCredentialType, ...subAssistantsMissing]

  return allMissing.map((item) => {
    // Extract unique toolkits from missing tools
    const toolkits = Array.from(new Set(item.missing_tools.map((tool) => tool.toolkit)))

    return {
      credential_type: item.credential_type,
      label: item.credential_type,
      toolkits,
      tools: item.missing_tools.map((tool) => ({
        toolkit: tool.toolkit,
        tool: tool.tool,
        label: tool.label,
        credential_type: tool.credential_type,
      })),
      ...(item.assistant_id && {
        sub_assistant_name: item.assistant_name,
        sub_assistant_id: item.assistant_id,
        sub_assistant_icon_url: item.icon_url,
      }),
    }
  })
}
