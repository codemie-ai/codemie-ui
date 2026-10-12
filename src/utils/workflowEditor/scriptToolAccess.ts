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

import type { AssistantToolkit } from '@/types/entity/assistant'
import type { AssistantTool } from '@/types/workflowEditor'

/** Same shape as an assistant tool of a workflow: no alias means the automatic lookup. */
export type ScriptToolAccessItem = AssistantTool

/** Spreads items so unknown keys survive a round trip. */
export const toScriptToolAccess = (value: unknown): ScriptToolAccessItem[] => {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is Record<string, any> => typeof item === 'object' && item !== null)
    .map((item) => ({ ...item, name: String(item.name ?? '') }))
}

/** Items whose tool the picker can show; the rest cannot be edited there. */
export const isToolInToolkits = (name: string, toolkits: AssistantToolkit[]): boolean =>
  toolkits.some((toolkit) => toolkit.tools.some((tool) => tool.name === name))
