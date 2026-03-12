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

import { AssistantToolkit } from '@/types/entity/assistant'

const normalizeStringField = (value: string | null | undefined): string => {
  return value ?? ''
}

const normalizeSettingValue = (setting: any): string | null => {
  if (!setting) return null
  if (typeof setting === 'string') return setting
  if (typeof setting === 'object' && setting.id) return setting.id
  return null
}

export const normalizeToolkitsForComparison = (toolkits: AssistantToolkit[]) => {
  return toolkits.map((toolkit) => ({
    toolkit: toolkit.toolkit,
    settings: normalizeSettingValue(toolkit.settings),
    tools:
      toolkit.tools?.map((tool) => ({
        ...tool,
        description: normalizeStringField(tool.description),
        user_description: normalizeStringField(tool.user_description),
        settings: normalizeSettingValue(tool.settings),
      })) ?? [],
  }))
}
