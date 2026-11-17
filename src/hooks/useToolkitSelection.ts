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
import { findExclusivePairTool, isDefaultToolName } from '@/utils/defaultDatasourceTools'

interface UseToolkitSelectionProps {
  selectedToolkits: AssistantToolkit[]
  onToolkitsChange: (toolkits: AssistantToolkit[]) => void
  disabledContextTools?: string[]
  onDisabledContextToolsChange?: (next: string[]) => void
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
  disabledContextTools,
  onDisabledContextToolsChange,
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

  /**
   * `bulkTools` is passed by surfaces that model default datasource tools (see
   * `getBulkSelectableTools`). `deselectListNames` are the default tools whose state lives in
   * `disabledContextTools` (a matching datasource is attached), so they are toggled there; any
   * other bulk tool, default or not, is stored in the toolkit list. The "with filtering" variants
   * left out of `bulkTools` are dropped on select-all to keep the pairs exclusive.
   */
  const toggleAllTools = useCallback(
    (
      toolkit: AssistantToolkit,
      allToolsSelected: boolean,
      bulkTools?: Tool[],
      deselectListNames: string[] = []
    ) => {
      const existingToolkit = selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit)
      const candidates = bulkTools
        ? bulkTools.filter((tl) => !deselectListNames.includes(tl.name))
        : toolkit.tools

      let updatedTools: Tool[] = []
      if (allToolsSelected) {
        updateSelectedToolkits(toolkit, [])
      } else if (existingToolkit) {
        const bulkNames = new Set(bulkTools?.map((tl) => tl.name))
        const kept = bulkTools
          ? existingToolkit.tools.filter(
              (tl) =>
                !deselectListNames.includes(tl.name) &&
                (bulkNames.has(tl.name) || !toolkit.tools.some((t) => t.name === tl.name))
            )
          : existingToolkit.tools
        updatedTools = [
          ...candidates.filter((tl) => !kept.some((existingTl) => tl.name === existingTl.name)),
          ...kept,
        ]
      } else {
        updatedTools = candidates
      }

      updateSelectedToolkits(toolkit, updatedTools)

      if (deselectListNames.length) {
        const current = disabledContextTools ?? []
        onDisabledContextToolsChange?.(
          allToolsSelected
            ? [...current, ...deselectListNames.filter((name) => !current.includes(name))]
            : current.filter((name) => !deselectListNames.includes(name))
        )
      }
    },
    [selectedToolkits, updateSelectedToolkits, disabledContextTools, onDisabledContextToolsChange]
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

  /**
   * Flip `tool.name` in/out of the deselected-default-tools list. When this selects a default
   * tool back on, and that tool has an exclusive "with filtering" pair that is currently selected
   * in `selectedToolkits`, remove that pair tool too — the two are mutually exclusive, so
   * re-enabling the default must not leave both active.
   */
  const toggleDefaultTool = useCallback(
    (toolkit: AssistantToolkit, tool: Tool) => {
      const currentlyDeselected = disabledContextTools ?? []
      const isCurrentlyDeselected = currentlyDeselected.includes(tool.name)

      const nextDeselected = isCurrentlyDeselected
        ? currentlyDeselected.filter((name) => name !== tool.name)
        : [...currentlyDeselected, tool.name]

      onDisabledContextToolsChange?.(nextDeselected)

      // With a datasource attached the deselected list is the only home of this tool, so drop any
      // copy stored while none was attached. Re-enabling also drops the exclusive pair. One update:
      // separate ones would each rebuild the list from the same snapshot.
      const dropNames = new Set([tool.name])
      if (isCurrentlyDeselected) {
        const pairTool = findExclusivePairTool(toolkit, tool)
        if (pairTool) dropNames.add(pairTool.name)
      }
      const existingToolkit = selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit)
      if (existingToolkit?.tools.some((t) => dropNames.has(t.name))) {
        updateSelectedToolkits(
          toolkit,
          existingToolkit.tools.filter((t) => !dropNames.has(t.name))
        )
      }
    },
    [selectedToolkits, disabledContextTools, onDisabledContextToolsChange, updateSelectedToolkits]
  )

  /**
   * Toggle a regular tool selection (single or multi mode) and, when that newly selects a tool
   * whose exclusive pair is a default tool, deselect that default tool — selecting the
   * "with filtering" variant makes the plain default tool redundant.
   */
  const toggleToolAndSyncDefaults = useCallback(
    (toolkit: AssistantToolkit, tool: Tool, isSingleSelection: boolean) => {
      const existingToolkit = selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit)
      const wasSelected = !!existingToolkit?.tools.find((t) => t.name === tool.name)

      const pairTool = findExclusivePairTool(toolkit, tool)
      const pairInToolkitList =
        !!pairTool && !!existingToolkit?.tools.some((t) => t.name === pairTool.name)

      if (isSingleSelection) {
        toggleSingleTool(toolkit, tool)
      } else if (!wasSelected && pairInToolkitList) {
        // Without a datasource a default tool is kept in the toolkit list like any other tool, so
        // the exclusive pair has to leave that list in the same update; two separate updates
        // would each rebuild the list from the same snapshot and the second would undo the first.
        updateSelectedToolkits(toolkit, [
          ...existingToolkit!.tools.filter((t) => t.name !== pairTool.name),
          tool,
        ])
      } else {
        toggleMultiTool(toolkit, tool)
      }

      if (!wasSelected) {
        const currentlyDeselected = disabledContextTools ?? []
        if (
          pairTool &&
          isDefaultToolName(pairTool.name) &&
          !currentlyDeselected.includes(pairTool.name)
        ) {
          onDisabledContextToolsChange?.([...currentlyDeselected, pairTool.name])
        }
      }
    },
    [
      selectedToolkits,
      disabledContextTools,
      onDisabledContextToolsChange,
      toggleSingleTool,
      toggleMultiTool,
      updateSelectedToolkits,
    ]
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
    toggleDefaultTool,
    toggleToolAndSyncDefaults,
  }
}
