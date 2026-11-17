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

import { AssistantContext, AssistantToolkit, ContextType, Tool } from '@/types/entity/assistant'

export const DEFAULT_TOOL_NAME = {
  CODE_TREE: 'get_repository_file_tree',
  SEARCH_CODE: 'search_code_repo',
  SEARCH_KB: 'search_kb',
} as const

const DEFAULT_TOOL_NAMES: string[] = Object.values(DEFAULT_TOOL_NAME)

export const isDefaultToolName = (name: string): boolean => DEFAULT_TOOL_NAMES.includes(name)

export const getContextTypeForDefaultTool = (name: string): ContextType | undefined => {
  let contextType: ContextType | undefined

  switch (name) {
    case DEFAULT_TOOL_NAME.CODE_TREE:
    case DEFAULT_TOOL_NAME.SEARCH_CODE:
      contextType = ContextType.CODE
      break
    case DEFAULT_TOOL_NAME.SEARCH_KB:
      contextType = ContextType.KNOWLEDGE_BASE
      break
    default:
      contextType = undefined
  }

  return contextType
}

export const hasContextOfType = (
  context: AssistantContext[] | undefined,
  type: ContextType
): boolean => !!context?.some((item) => item.context_type === type)

export const isDefaultToolActive = (
  name: string,
  disabledContextTools: string[] | undefined
): boolean => {
  const deselected = disabledContextTools ?? []
  return !deselected.includes(name)
}

/**
 * Whether a datasource matching this default tool's context type is attached, independent of
 * `disabledContextTools`. This is the gate a checkbox click should test before toggling the
 * tool: `isDefaultToolActive` folds in the deselected state too, so it can't tell "no context
 * attached, clicking would do nothing visible" apart from "context attached, currently deselected,
 * clicking re-selects it".
 */
export const isDefaultToolContextAttached = (
  name: string,
  context: AssistantContext[] | undefined
): boolean => {
  const contextType = getContextTypeForDefaultTool(name)
  return !!contextType && hasContextOfType(context, contextType)
}

/**
 * Default tool -> its "with filtering" counterpart, keyed by backend tool name (labels are
 * display-only and carry suffixes such as "(Experimental)", so they are never used for matching).
 * Mirrors the `_v2` tools in the backend's code toolkit `tools_vars.py`; there is no KB variant.
 */
const FILTERING_TOOL_NAME: Record<string, string> = {
  [DEFAULT_TOOL_NAME.CODE_TREE]: 'get_repository_file_tree_v2',
  [DEFAULT_TOOL_NAME.SEARCH_CODE]: 'search_code_repo_v2',
}

const DEFAULT_TOOL_NAME_BY_FILTERING = Object.fromEntries(
  Object.entries(FILTERING_TOOL_NAME).map(([base, filtering]) => [filtering, base])
)

export const findExclusivePairTool = (toolkit: AssistantToolkit, tool: Tool): Tool | undefined => {
  const siblingName = FILTERING_TOOL_NAME[tool.name] ?? DEFAULT_TOOL_NAME_BY_FILTERING[tool.name]

  return siblingName ? toolkit.tools.find((candidate) => candidate.name === siblingName) : undefined
}

/**
 * Tools a bulk "Select all" / "Unselect all" acts on: every tool except a "with filtering"
 * variant of a default tool — the two are mutually exclusive, so bulk-selecting both is
 * impossible. Default tools are included whether or not a datasource is attached; where their
 * selection is stored depends on that (see `isDefaultToolContextAttached`).
 */
export const getBulkSelectableTools = (toolkit: AssistantToolkit): Tool[] =>
  toolkit.tools.filter((tool) => {
    const pair = findExclusivePairTool(toolkit, tool)
    return !(pair && isDefaultToolName(pair.name) && !isDefaultToolName(tool.name))
  })

/**
 * Default tools that are effectively on for an assistant but never stored in its `toolkits`:
 * a matching datasource is attached and the tool is not in `disabledContextTools`. Returned as
 * catalog toolkits narrowed to those tools, for read-only views that list what an assistant uses.
 */
export const getActiveDefaultToolkits = (
  catalog: AssistantToolkit[],
  context: AssistantContext[] | undefined,
  disabledContextTools: string[] | undefined
): AssistantToolkit[] =>
  catalog
    .map((toolkit) => ({
      ...toolkit,
      tools: toolkit.tools.filter(
        (tool) =>
          isDefaultToolName(tool.name) &&
          isDefaultToolContextAttached(tool.name, context) &&
          isDefaultToolActive(tool.name, disabledContextTools)
      ),
    }))
    .filter((toolkit) => toolkit.tools.length > 0)

/** Default tools are never sent in `toolkits`; their selection is sent in `disabled_context_tools`. */
export const withoutDefaultTools = (toolkits: AssistantToolkit[]): AssistantToolkit[] =>
  toolkits.flatMap((toolkit) => {
    const tools = toolkit.tools.filter((tool) => !isDefaultToolName(tool.name))
    return tools.length === 0 && toolkit.tools.length > 0 ? [] : [{ ...toolkit, tools }]
  })
