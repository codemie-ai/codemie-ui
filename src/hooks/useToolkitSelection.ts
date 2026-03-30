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
        onToolkitsChange([
          {
            ...toolkit,
            tools: [tool],
            settings: undefined,
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
    (toolkit: AssistantToolkit, setting?: Setting | null) => {
      const existingToolkit = selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit)

      if (existingToolkit) {
        onToolkitsChange(
          selectedToolkits.map((tk) =>
            tk.toolkit === toolkit.toolkit ? { ...tk, settings: setting || undefined } : tk
          )
        )
      }
    },
    [selectedToolkits, onToolkitsChange]
  )

  const updateToolSetting = useCallback(
    (toolkit: AssistantToolkit, tool: Tool, settings?: Setting | null) => {
      const existingToolkit = selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit)

      if (existingToolkit) {
        const updatedTools = existingToolkit.tools.map((t) =>
          t.name === tool.name ? { ...t, settings: settings || undefined } : t
        )
        updateSelectedToolkits(toolkit, updatedTools)
      }
    },
    [selectedToolkits, updateSelectedToolkits]
  )

  return {
    updateSelectedToolkits,
    toggleSingleTool,
    toggleMultiTool,
    toggleAllTools,
    updateToolkitSetting,
    updateToolSetting,
  }
}
