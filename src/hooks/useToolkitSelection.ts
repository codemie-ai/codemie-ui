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

import { useCallback } from 'react'

import type { AssistantToolkit, Tool } from '@/types/entity/assistant'
import type { Setting } from '@/types/entity/setting'

interface UseToolkitSelectionProps {
  selectedToolkits: AssistantToolkit[]
  onToolkitsChange: (toolkits: AssistantToolkit[]) => void
}

export interface SettingUpdateOptions {
  /**
   * Whether choosing an integration on this surface also settles the automatic-lookup question.
   *
   * Only surfaces that show the switch may set it: picking an integration there means manual mode,
   * and so does clearing it — an empty slot the user emptied is "no integration", not "resolve one
   * per user". Surfaces without the switch (the plugin panel) stay flag-neutral, because they offer
   * no way to undo a decision they would be recording on the user's behalf.
   */
  recordAutoLookup?: boolean
}

const recordedAutoLookup = (options?: SettingUpdateOptions) =>
  options?.recordAutoLookup ? { auto_credentials_lookup: false } : {}

export const useToolkitSelection = ({
  selectedToolkits,
  onToolkitsChange,
}: UseToolkitSelectionProps) => {
  const updateSelectedToolkits = useCallback(
    (toolkit: AssistantToolkit, updatedTools: Tool[]) => {
      const existingToolkit = selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit)

      if (updatedTools.length === 0) {
        onToolkitsChange(selectedToolkits.filter((tk) => tk.toolkit !== toolkit.toolkit))
      } else if (existingToolkit) {
        onToolkitsChange(
          selectedToolkits.map((tk) =>
            tk.toolkit === toolkit.toolkit ? { ...tk, tools: updatedTools } : tk
          )
        )
      } else {
        onToolkitsChange([
          ...selectedToolkits,
          {
            ...toolkit,
            tools: updatedTools,
            settings: undefined,
          },
        ])
      }
    },
    [selectedToolkits, onToolkitsChange]
  )

  const toggleSingleTool = useCallback(
    (toolkit: AssistantToolkit, tool: Tool) => {
      const existingToolkit = selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit)
      const toolExists = existingToolkit?.tools.find((t) => t.name === tool.name)

      if (toolExists) {
        onToolkitsChange([])
      } else {
        // Preserve the toolkit-level integration only when the newly picked tool
        // uses it (settings_config=false). Tools with settings_config=true carry
        // their own tool.settings, so any toolkit-level settings would be orphaned
        // — visible in the toolkit dropdown but ignored by extractToolkitSettings
        // on save, producing a stale-UI vs. empty-save mismatch.
        const preserveToolkitSettings = !tool.settings_config
        onToolkitsChange([
          {
            ...toolkit,
            tools: [tool],
            settings: preserveToolkitSettings ? existingToolkit?.settings : undefined,
          },
        ])
      }
    },
    [selectedToolkits, onToolkitsChange]
  )

  const toggleMultiTool = useCallback(
    (toolkit: AssistantToolkit, tool: Tool) => {
      const existingToolkit = selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit)

      let updatedTools: Tool[] = []
      if (existingToolkit) {
        const toolExists = existingToolkit.tools.find((t) => t.name === tool.name)
        if (toolExists) {
          updatedTools = existingToolkit.tools.filter((t) => t.name !== tool.name)
        } else {
          updatedTools = [...existingToolkit.tools, tool]
        }
      } else {
        updatedTools = [tool]
      }

      updateSelectedToolkits(toolkit, updatedTools)
    },
    [selectedToolkits, updateSelectedToolkits]
  )

  const toggleAllTools = useCallback(
    (toolkit: AssistantToolkit, allToolsSelected: boolean) => {
      const existingToolkit = selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit)

      let updatedTools: Tool[] = []
      if (allToolsSelected) {
        updateSelectedToolkits(toolkit, [])
      } else if (existingToolkit) {
        updatedTools = [
          ...toolkit.tools.filter(
            (tl) => !existingToolkit.tools.some((existingTl) => tl.name === existingTl.name)
          ),
          ...existingToolkit.tools,
        ]
      } else {
        updatedTools = toolkit.tools
      }

      updateSelectedToolkits(toolkit, updatedTools)
    },
    [selectedToolkits, updateSelectedToolkits]
  )

  const updateToolkitSetting = useCallback(
    (toolkit: AssistantToolkit, setting?: Setting | null, options?: SettingUpdateOptions) => {
      const existingToolkit = selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit)

      if (existingToolkit) {
        onToolkitsChange(
          selectedToolkits.map((tk) =>
            tk.toolkit === toolkit.toolkit
              ? { ...tk, settings: setting || undefined, ...recordedAutoLookup(options) }
              : tk
          )
        )
      }
    },
    [selectedToolkits, onToolkitsChange]
  )

  const updateToolSetting = useCallback(
    (
      toolkit: AssistantToolkit,
      tool: Tool,
      settings?: Setting | null,
      options?: SettingUpdateOptions
    ) => {
      const existingToolkit = selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit)

      if (existingToolkit) {
        const updatedTools = existingToolkit.tools.map((t) =>
          t.name === tool.name
            ? { ...t, settings: settings || undefined, ...recordedAutoLookup(options) }
            : t
        )
        updateSelectedToolkits(toolkit, updatedTools)
      }
    },
    [selectedToolkits, updateSelectedToolkits]
  )

  /**
   * Persist the author's automatic-credentials-lookup decision for a whole toolkit. It has to be
   * stored, not derived: "lookup off with nothing pinned" and "lookup on" both leave `settings`
   * empty, and only a stored flag tells them apart.
   */
  const updateToolkitAutoLookup = useCallback(
    (toolkit: AssistantToolkit, enabled: boolean) => {
      // One update, not two: enabling lookup also drops the pinned integration, and doing that
      // through a second call would rebuild the list from the same snapshot and revert this flag.
      onToolkitsChange(
        selectedToolkits.map((tk) =>
          tk.toolkit === toolkit.toolkit
            ? {
                ...tk,
                auto_credentials_lookup: enabled,
                ...(enabled ? { settings: undefined } : {}),
              }
            : tk
        )
      )
    },
    [selectedToolkits, onToolkitsChange]
  )

  /** Same decision for a single tool inside a toolkit. */
  const updateToolAutoLookup = useCallback(
    (toolkit: AssistantToolkit, tool: Tool, enabled: boolean) => {
      onToolkitsChange(
        selectedToolkits.map((tk) =>
          tk.toolkit === toolkit.toolkit
            ? {
                ...tk,
                tools: tk.tools.map((t) =>
                  t.name === tool.name
                    ? {
                        ...t,
                        auto_credentials_lookup: enabled,
                        ...(enabled ? { settings: undefined } : {}),
                      }
                    : t
                ),
              }
            : tk
        )
      )
    },
    [selectedToolkits, onToolkitsChange]
  )

  return {
    updateSelectedToolkits,
    toggleSingleTool,
    toggleMultiTool,
    toggleAllTools,
    updateToolkitSetting,
    updateToolSetting,
    updateToolkitAutoLookup,
    updateToolAutoLookup,
  }
}
