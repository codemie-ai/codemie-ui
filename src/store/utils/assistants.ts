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

import { AssistantType } from '@/constants/assistants'
import { Assistant, CreateAssistantDto } from '@/types/entity/assistant'

export function transformAssistantToCreateDTO(assistant: Assistant): CreateAssistantDto {
  // Handle skill_ids: prefer explicit skill_ids from form, fallback to extracting from skills array
  const skillIds = (assistant as any).skill_ids ?? assistant.skills?.map((s) => s.id) ?? []

  return {
    name: assistant.name,
    description: assistant.description,
    system_prompt: assistant.system_prompt,
    project: assistant.project,
    context: assistant.context, // Type casting as the structure should match
    icon_url: assistant.icon_url,
    llm_model_type: assistant.llm_model_type,
    // Filter out MCP toolkit as it's handled separately
    toolkits: assistant.toolkits
      ?.filter((tk) => tk.toolkit !== 'MCP')
      .map((toolkit) => ({
        toolkit: toolkit.toolkit,
        tools: toolkit.tools?.map((tool) => ({
          name: tool.name,
          label: tool.label,
          settings_config: tool.settings_config,
          settings: tool.settings,
          description: tool.description,
          user_description: tool.user_description,
        })),
        label: toolkit.label,
        settings_config: toolkit.settings_config,
        settings: toolkit.settings,
        is_external: toolkit.is_external,
      })),
    conversation_starters: assistant.conversation_starters,
    shared: assistant.shared,
    is_react: true,
    is_global: assistant.is_global,
    // agent_mode: assistant.agent_mode,
    // plan_prompt: assistant.plan_prompt,
    slug: assistant.slug,
    temperature: assistant.temperature,
    top_p: assistant.top_p || undefined,
    // Handle MCP servers if MCP toolkit exists
    mcp_servers: assistant.mcp_servers,
    assistant_ids:
      assistant.nested_assistants?.map((a) => a.id) || assistant.nestedAssistants?.map((a) => a.id),
    type: assistant.type as AssistantType, // Type casting as the value should match the enum
    categories: assistant.categories,
    prompt_variables: assistant.prompt_variables,
    smart_tool_selection_enabled: assistant.smart_tool_selection_enabled,
    guardrail_assignments: assistant.guardrail_assignments,
    skill_ids: skillIds,
    // agent_card: assistant.agent_cards
  }
}
