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

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AssistantToolkit, ContextType, Tool } from '@/types/entity/assistant'

import Toolkit from '../Toolkit'

vi.mock('../../../../ToolkitIcon', () => ({ default: () => <span /> }))

describe('author Toolkit — default tool checked state and toggle wiring', () => {
  afterEach(cleanup)

  const standard: Tool = {
    name: 'get_repository_file_tree',
    label: 'Get Repo Tree',
    settings_config: false,
  } as Tool

  const toolkit = {
    toolkit: 'codebase',
    label: 'Codebase Tools',
    tools: [standard],
    settings_config: false,
    is_external: false,
  } as unknown as AssistantToolkit

  it('shows the default tool unchecked with no matching context and checked once one is attached', () => {
    const { rerender } = render(
      <Toolkit
        toolkit={toolkit}
        selectedToolkits={[]}
        defaultTools={{ context: [], disabledContextTools: [], toggleDefaultTool: vi.fn() }}
        settings={{}}
        toggleTool={vi.fn()}
        toggleAllTools={vi.fn()}
        updateToolSetting={vi.fn()}
        updateToolkitSetting={vi.fn()}
        onAddSettingClick={vi.fn()}
      />
    )
    expect(screen.getByLabelText('Get Repo Tree')).not.toBeChecked()

    rerender(
      <Toolkit
        toolkit={toolkit}
        selectedToolkits={[]}
        defaultTools={{
          context: [{ name: 'repo', context_type: ContextType.CODE, id: '1' }],
          disabledContextTools: [],
          toggleDefaultTool: vi.fn(),
        }}
        settings={{}}
        toggleTool={vi.fn()}
        toggleAllTools={vi.fn()}
        updateToolSetting={vi.fn()}
        updateToolkitSetting={vi.fn()}
        onAddSettingClick={vi.fn()}
      />
    )
    expect(screen.getByLabelText('Get Repo Tree')).toBeChecked()
  })

  it('calls toggleDefaultTool, not toggleTool, when a default tool checkbox is clicked', async () => {
    const toggleTool = vi.fn()
    const toggleDefaultTool = vi.fn()

    render(
      <Toolkit
        toolkit={toolkit}
        selectedToolkits={[]}
        defaultTools={{
          context: [{ name: 'repo', context_type: ContextType.CODE, id: '1' }],
          disabledContextTools: [],
          toggleDefaultTool,
        }}
        settings={{}}
        toggleTool={toggleTool}
        toggleAllTools={vi.fn()}
        updateToolSetting={vi.fn()}
        updateToolkitSetting={vi.fn()}
        onAddSettingClick={vi.fn()}
      />
    )

    await userEvent.click(screen.getByLabelText('Get Repo Tree'))

    expect(toggleDefaultTool).toHaveBeenCalledWith(toolkit, standard)
    expect(toggleTool).not.toHaveBeenCalled()
  })

  it('routes a default tool through toggleTool when no matching context is attached (stored in the toolkit list)', async () => {
    const toggleTool = vi.fn()
    const toggleDefaultTool = vi.fn()

    render(
      <Toolkit
        toolkit={toolkit}
        selectedToolkits={[]}
        defaultTools={{ context: [], disabledContextTools: [], toggleDefaultTool }}
        settings={{}}
        toggleTool={toggleTool}
        toggleAllTools={vi.fn()}
        updateToolSetting={vi.fn()}
        updateToolkitSetting={vi.fn()}
        onAddSettingClick={vi.fn()}
      />
    )

    await userEvent.click(screen.getByLabelText('Get Repo Tree'))

    expect(toggleDefaultTool).not.toHaveBeenCalled()
    expect(toggleTool).toHaveBeenCalledWith(toolkit, standard)
  })

  it('treats the reserved tool name as an ordinary tool when the caller does not wire context (ToolSelector/SkillForm)', async () => {
    const toggleTool = vi.fn()
    const toolkitWithSelection = {
      ...toolkit,
      tools: [standard],
    } as unknown as AssistantToolkit

    render(
      <Toolkit
        toolkit={toolkitWithSelection}
        selectedToolkits={[{ ...toolkitWithSelection, tools: [standard] }]}
        settings={{}}
        toggleTool={toggleTool}
        toggleAllTools={vi.fn()}
        updateToolSetting={vi.fn()}
        updateToolkitSetting={vi.fn()}
        onAddSettingClick={vi.fn()}
      />
    )

    // context was never passed: checked state must come from toolkit membership, not
    // isDefaultToolActive (which would force it unchecked with no context).
    expect(screen.getByLabelText('Get Repo Tree')).toBeChecked()

    await userEvent.click(screen.getByLabelText('Get Repo Tree'))

    expect(toggleTool).toHaveBeenCalledWith(toolkitWithSelection, standard)
  })
})
