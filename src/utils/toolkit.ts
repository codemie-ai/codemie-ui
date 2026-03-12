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

import { AssistantToolkit, Tool } from '@/types/entity/assistant'
import { Setting } from '@/types/entity/setting'

export const extractToolkitSettings = (
  toolkit: AssistantToolkit | null | undefined,
  tool: Tool | null | undefined
): { alias: string | undefined; id: string | undefined } => {
  if (!toolkit) {
    return { alias: undefined, id: undefined }
  }

  if (tool?.settings_config === true) {
    return {
      alias: tool.settings?.alias,
      id: tool.settings?.id,
    }
  }

  return {
    alias: toolkit.settings?.alias,
    id: toolkit.settings?.id,
  }
}

export const applyToolkitSettings = (
  toolkit: AssistantToolkit,
  tool: Tool | null | undefined,
  setting: Setting | null | undefined
): { toolkit: AssistantToolkit; tool: Tool | null | undefined } => {
  if (!setting) {
    return { toolkit, tool }
  }

  const toolkitCopy = { ...toolkit }
  const toolCopy = tool ? { ...tool } : null

  if (toolCopy?.settings_config === true) {
    toolCopy.settings = setting
    return { toolkit: toolkitCopy, tool: toolCopy }
  }

  toolkitCopy.settings = setting
  return { toolkit: toolkitCopy, tool: toolCopy }
}
