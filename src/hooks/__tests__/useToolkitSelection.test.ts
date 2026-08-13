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

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { AssistantToolkit, Tool } from '@/types/entity/assistant'

import { useToolkitSelection } from '../useToolkitSelection'

const makeTool = (name: string): Tool => ({
  name,
  label: name,
  settings_config: false,
  tool: null,
})

const makeToolkit = (
  toolkit: string,
  tools: Tool[] = [],
  extraTools: Tool[] = []
): AssistantToolkit => ({
  toolkit: toolkit as any,
  label: toolkit,
  tools: [...tools, ...extraTools],
  settings_config: false,
  is_external: false,
})

describe('useToolkitSelection', () => {
  let onToolkitsChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onToolkitsChange = vi.fn()
  })

  describe('updateSelectedToolkits', () => {
    it('should remove toolkit from the list when updatedTools is empty', () => {
      const toolkit = makeToolkit('search', [makeTool('search_tool')])
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [toolkit], onToolkitsChange })
      )

      act(() => {
        result.current.updateSelectedToolkits(toolkit, [])
      })

      expect(onToolkitsChange).toHaveBeenCalledWith([])
    })

    it('should update tools of an existing toolkit', () => {
      const tool1 = makeTool('tool1')
      const tool2 = makeTool('tool2')
      const toolkit = makeToolkit('search', [tool1])
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [toolkit], onToolkitsChange })
      )

      act(() => {
        result.current.updateSelectedToolkits(toolkit, [tool1, tool2])
      })

      expect(onToolkitsChange).toHaveBeenCalledWith([
        expect.objectContaining({ toolkit: 'search', tools: [tool1, tool2] }),
      ])
    })

    it('should add a new toolkit when it does not exist in selectedToolkits', () => {
      const toolkit = makeToolkit('code', [makeTool('run_code')])
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [], onToolkitsChange })
      )

      act(() => {
        result.current.updateSelectedToolkits(toolkit, [makeTool('run_code')])
      })

      expect(onToolkitsChange).toHaveBeenCalledWith([
        expect.objectContaining({ toolkit: 'code', settings: undefined }),
      ])
    })
  })

  describe('toggleSingleTool', () => {
    it('should deselect all toolkits when the tool is already selected', () => {
      const tool = makeTool('my_tool')
      const toolkit = makeToolkit('search', [tool])
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [toolkit], onToolkitsChange })
      )

      act(() => {
        result.current.toggleSingleTool(toolkit, tool)
      })

      expect(onToolkitsChange).toHaveBeenCalledWith([])
    })

    it('should select only the single tool when the tool is not yet selected', () => {
      const tool = makeTool('my_tool')
      const toolkit = makeToolkit('search', [])
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [], onToolkitsChange })
      )

      act(() => {
        result.current.toggleSingleTool(toolkit, tool)
      })

      expect(onToolkitsChange).toHaveBeenCalledWith([
        expect.objectContaining({ toolkit: 'search', tools: [tool], settings: undefined }),
      ])
    })

    it('should replace any previous toolkit selection with the single tool', () => {
      const otherTool = makeTool('other_tool')
      const tool = makeTool('my_tool')
      const existingToolkit = makeToolkit('search', [otherTool])
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [existingToolkit], onToolkitsChange })
      )

      act(() => {
        result.current.toggleSingleTool(existingToolkit, tool)
      })

      // tool is not found in existingToolkit.tools → sets only [tool]
      expect(onToolkitsChange).toHaveBeenCalledWith([
        expect.objectContaining({ tools: [tool], settings: undefined }),
      ])
    })

    // EPMCDME-10653 — regression: toggling a different tool inside a toolkit that
    // already has an integration selected must preserve that integration. Without
    // this guard the workflow Tool popup silently drops the integration on Save.
    it('should preserve existing toolkit settings when toggling a different tool', () => {
      const firstTool = makeTool('first_tool')
      const secondTool = makeTool('second_tool')
      const integration = { id: 'int-1', alias: 'my-git-integration' } as any
      const existingToolkit: AssistantToolkit = {
        ...makeToolkit('git', [firstTool]),
        settings: integration,
      }
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [existingToolkit], onToolkitsChange })
      )

      act(() => {
        result.current.toggleSingleTool(existingToolkit, secondTool)
      })

      expect(onToolkitsChange).toHaveBeenCalledWith([
        expect.objectContaining({
          toolkit: 'git',
          tools: [secondTool],
          settings: integration,
        }),
      ])
    })

    // EPMCDME-10653 — when the newly picked tool uses per-tool integrations
    // (settings_config: true), extractToolkitSettings on save reads tool.settings
    // and ignores toolkit.settings. Preserving a stale toolkit-level integration
    // would leave the toolkit dropdown showing an integration that the save path
    // then discards, so it must be cleared.
    it('should NOT preserve toolkit settings when the new tool uses per-tool integrations', () => {
      const firstTool = makeTool('first_tool') // settings_config: false
      const secondTool: Tool = { ...makeTool('second_tool'), settings_config: true }
      const integration = { id: 'int-1', alias: 'my-git-integration' } as any
      const existingToolkit: AssistantToolkit = {
        ...makeToolkit('git', [firstTool]),
        settings: integration,
      }
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [existingToolkit], onToolkitsChange })
      )

      act(() => {
        result.current.toggleSingleTool(existingToolkit, secondTool)
      })

      expect(onToolkitsChange).toHaveBeenCalledWith([
        expect.objectContaining({
          toolkit: 'git',
          tools: [secondTool],
          settings: undefined,
        }),
      ])
    })
  })

  describe('toggleMultiTool', () => {
    it('should add a tool to an existing toolkit when it is not yet selected', () => {
      const tool1 = makeTool('tool1')
      const tool2 = makeTool('tool2')
      const toolkit = makeToolkit('search', [tool1])
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [toolkit], onToolkitsChange })
      )

      act(() => {
        result.current.toggleMultiTool(toolkit, tool2)
      })

      expect(onToolkitsChange).toHaveBeenCalledWith([
        expect.objectContaining({ toolkit: 'search', tools: [tool1, tool2] }),
      ])
    })

    it('should remove a tool from an existing toolkit when it is already selected', () => {
      const tool1 = makeTool('tool1')
      const tool2 = makeTool('tool2')
      const toolkit = makeToolkit('search', [tool1, tool2])
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [toolkit], onToolkitsChange })
      )

      act(() => {
        result.current.toggleMultiTool(toolkit, tool1)
      })

      // tool1 is removed, toolkit with only [tool2] remains
      expect(onToolkitsChange).toHaveBeenCalledWith([
        expect.objectContaining({ toolkit: 'search', tools: [tool2] }),
      ])
    })

    it('should add a new toolkit with the tool when the toolkit does not exist', () => {
      const tool = makeTool('new_tool')
      const toolkit = makeToolkit('code', [tool])
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [], onToolkitsChange })
      )

      act(() => {
        result.current.toggleMultiTool(toolkit, tool)
      })

      expect(onToolkitsChange).toHaveBeenCalledWith([
        expect.objectContaining({ toolkit: 'code', tools: [tool] }),
      ])
    })

    it('should remove toolkit when last tool is deselected', () => {
      const tool = makeTool('only_tool')
      const toolkit = makeToolkit('search', [tool])
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [toolkit], onToolkitsChange })
      )

      act(() => {
        result.current.toggleMultiTool(toolkit, tool)
      })

      // updatedTools will be [] → toolkit removed
      expect(onToolkitsChange).toHaveBeenCalledWith([])
    })
  })

  describe('toggleAllTools', () => {
    it('should remove toolkit when allToolsSelected is true', () => {
      const tool = makeTool('tool1')
      const toolkit = makeToolkit('search', [tool])
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [toolkit], onToolkitsChange })
      )

      act(() => {
        result.current.toggleAllTools(toolkit, true)
      })

      expect(onToolkitsChange).toHaveBeenCalledWith([])
    })

    it('should add all toolkit tools when no tools are currently selected and allToolsSelected is false', () => {
      const tool1 = makeTool('tool1')
      const tool2 = makeTool('tool2')
      const toolkit = makeToolkit('search', [tool1, tool2])
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [], onToolkitsChange })
      )

      act(() => {
        result.current.toggleAllTools(toolkit, false)
      })

      expect(onToolkitsChange).toHaveBeenCalledWith([
        expect.objectContaining({ toolkit: 'search', tools: [tool1, tool2] }),
      ])
    })

    it('should merge missing tools when some tools are already selected', () => {
      const tool1 = makeTool('tool1')
      const tool2 = makeTool('tool2')
      const tool3 = makeTool('tool3')
      // toolkit has all three tools; existingToolkit only has tool1
      const fullToolkit = makeToolkit('search', [tool1, tool2, tool3])
      const existingToolkit = makeToolkit('search', [tool1])
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [existingToolkit], onToolkitsChange })
      )

      act(() => {
        result.current.toggleAllTools(fullToolkit, false)
      })

      // Missing tools: tool2 and tool3 are prepended, then existing tool1
      expect(onToolkitsChange).toHaveBeenCalledWith([
        expect.objectContaining({
          toolkit: 'search',
          tools: expect.arrayContaining([tool1, tool2, tool3]),
        }),
      ])
    })
  })

  describe('updateToolkitSetting', () => {
    it('should update settings of an existing toolkit', () => {
      const toolkit = makeToolkit('search', [makeTool('t')])
      const setting = { key: 'api_key', value: 'secret' } as any
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [toolkit], onToolkitsChange })
      )

      act(() => {
        result.current.updateToolkitSetting(toolkit, setting)
      })

      expect(onToolkitsChange).toHaveBeenCalledWith([
        expect.objectContaining({ toolkit: 'search', settings: setting }),
      ])
    })

    it('should set settings to undefined when null is passed', () => {
      const toolkit = makeToolkit('search', [makeTool('t')])
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [toolkit], onToolkitsChange })
      )

      act(() => {
        result.current.updateToolkitSetting(toolkit, null)
      })

      expect(onToolkitsChange).toHaveBeenCalledWith([
        expect.objectContaining({ toolkit: 'search', settings: undefined }),
      ])
    })

    it('should not call onToolkitsChange when toolkit does not exist in selectedToolkits', () => {
      const toolkit = makeToolkit('nonexistent', [])
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [], onToolkitsChange })
      )

      act(() => {
        result.current.updateToolkitSetting(toolkit, { key: 'x' } as any)
      })

      expect(onToolkitsChange).not.toHaveBeenCalled()
    })
  })

  describe('updateToolSetting', () => {
    it('should update settings of a specific tool within a toolkit', () => {
      const tool = makeTool('my_tool')
      const toolkit = makeToolkit('search', [tool])
      const setting = { key: 'token', value: '123' } as any
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [toolkit], onToolkitsChange })
      )

      act(() => {
        result.current.updateToolSetting(toolkit, tool, setting)
      })

      expect(onToolkitsChange).toHaveBeenCalledWith([
        expect.objectContaining({
          toolkit: 'search',
          tools: [expect.objectContaining({ name: 'my_tool', settings: setting })],
        }),
      ])
    })

    it('should set tool settings to undefined when null is passed', () => {
      const tool = makeTool('my_tool')
      const toolkit = makeToolkit('search', [tool])
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [toolkit], onToolkitsChange })
      )

      act(() => {
        result.current.updateToolSetting(toolkit, tool, null)
      })

      expect(onToolkitsChange).toHaveBeenCalledWith([
        expect.objectContaining({
          tools: [expect.objectContaining({ name: 'my_tool', settings: undefined })],
        }),
      ])
    })

    it('should not call onToolkitsChange when toolkit does not exist in selectedToolkits', () => {
      const tool = makeTool('my_tool')
      const toolkit = makeToolkit('nonexistent', [tool])
      const { result } = renderHook(() =>
        useToolkitSelection({ selectedToolkits: [], onToolkitsChange })
      )

      act(() => {
        result.current.updateToolSetting(toolkit, tool, { key: 'x' } as any)
      })

      expect(onToolkitsChange).not.toHaveBeenCalled()
    })
  })
})

describe('useToolkitSelection — author auto credentials lookup', () => {
  const onToolkitsChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('persists the toolkit-level decision', () => {
    // The toggle used to be local form state only, so "lookup off, nothing pinned" could not be
    // expressed at all — it was indistinguishable from "lookup on".
    const tool = makeTool('generic_jira_tool')
    const toolkit = makeToolkit('jira', [tool])
    const { result } = renderHook(() =>
      useToolkitSelection({ selectedToolkits: [toolkit], onToolkitsChange })
    )

    act(() => {
      result.current.updateToolkitAutoLookup(toolkit, false)
    })

    const updated = onToolkitsChange.mock.calls[0][0]
    expect(updated[0].auto_credentials_lookup).toBe(false)
  })

  it('persists the tool-level decision without touching its siblings', () => {
    const jiraTool = makeTool('generic_jira_tool')
    const otherTool = makeTool('generic_confluence_tool')
    const toolkit = makeToolkit('mixed', [jiraTool, otherTool])
    const { result } = renderHook(() =>
      useToolkitSelection({ selectedToolkits: [toolkit], onToolkitsChange })
    )

    act(() => {
      result.current.updateToolAutoLookup(toolkit, jiraTool, false)
    })

    const updated = onToolkitsChange.mock.calls[0][0]
    const tools = updated[0].tools as Array<{ name: string; auto_credentials_lookup?: boolean }>
    expect(tools.find((t) => t.name === 'generic_jira_tool')?.auto_credentials_lookup).toBe(false)
    expect(tools.find((t) => t.name === 'generic_confluence_tool')?.auto_credentials_lookup).toBeUndefined()
  })
})

describe('useToolkitSelection — enabling auto lookup clears the pinned integration atomically', () => {
  const onToolkitsChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets the flag and drops the tool integration in one update', () => {
    // Two separate updates would each rebuild the list from the same snapshot, so the second one
    // silently reverted the first — that is how a slot ended up stored with lookup off.
    const tool = { ...makeTool('generic_jira_tool'), settings: { id: 'int-1' } } as Tool
    const toolkit = makeToolkit('jira', [tool])
    const { result } = renderHook(() =>
      useToolkitSelection({ selectedToolkits: [toolkit], onToolkitsChange })
    )

    act(() => {
      result.current.updateToolAutoLookup(toolkit, tool, true)
    })

    expect(onToolkitsChange).toHaveBeenCalledTimes(1)
    const updated = onToolkitsChange.mock.calls[0][0]
    const stored = updated[0].tools.find((t: Tool) => t.name === 'generic_jira_tool')
    expect(stored.auto_credentials_lookup).toBe(true)
    expect(stored.settings).toBeFalsy()
  })

  it('keeps the integration when auto lookup is turned off', () => {
    const tool = { ...makeTool('generic_jira_tool'), settings: { id: 'int-1' } } as Tool
    const toolkit = makeToolkit('jira', [tool])
    const { result } = renderHook(() =>
      useToolkitSelection({ selectedToolkits: [toolkit], onToolkitsChange })
    )

    act(() => {
      result.current.updateToolAutoLookup(toolkit, tool, false)
    })

    const stored = onToolkitsChange.mock.calls[0][0][0].tools[0]
    expect(stored.auto_credentials_lookup).toBe(false)
    expect(stored.settings).toEqual({ id: 'int-1' })
  })

  it('does the same for a toolkit-level slot', () => {
    const toolkit = { ...makeToolkit('jira', [makeTool('t')]), settings: { id: 'int-1' } } as never
    const { result } = renderHook(() =>
      useToolkitSelection({ selectedToolkits: [toolkit], onToolkitsChange })
    )

    act(() => {
      result.current.updateToolkitAutoLookup(toolkit, true)
    })

    expect(onToolkitsChange).toHaveBeenCalledTimes(1)
    const updated = onToolkitsChange.mock.calls[0][0][0]
    expect(updated.auto_credentials_lookup).toBe(true)
    expect(updated.settings).toBeFalsy()
  })
})
