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

import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'

import { WorkflowContext } from '@/pages/workflows/editor/hooks/useWorkflowContext'

import YamlPanel, { YamlPanelRef } from '../YamlPanel'

vi.mock('@/components/AceEditor/AceEditor', () => ({
  default: React.forwardRef(
    ({ value, onChange }: { value: string; onChange?: (v: string) => void }, ref: any) => {
      React.useImperativeHandle(ref, () => ({ editor: null, jumpToLine: vi.fn() }))
      return (
        <textarea
          data-testid="ace-editor"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )
    }
  ),
}))

vi.mock('@/components/Tabs/Tabs', () => ({
  default: ({ tabs, activeTab }: { tabs: any[]; activeTab: string }) => (
    <div>{tabs.find((t) => t.id === activeTab)?.element}</div>
  ),
}))

vi.mock('@/assets/icons/history.svg?react', () => ({
  default: () => null,
}))

vi.mock('@/assets/icons/expand.svg?react', () => ({
  default: () => null,
}))

vi.mock('@/assets/icons/collapse.svg?react', () => ({
  default: () => null,
}))

vi.mock('@/router', () => ({ router: {} }))

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    useSnapshot: (store: unknown) => store,
  }
})

vi.mock('@/store/appInfo', () => ({
  appInfoStore: { configs: [] },
}))

vi.mock('@/utils/settings', () => ({
  isConfigItemEnabled: () => false,
  getConfigItemSettings: () => null,
}))

vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), info: vi.fn() },
}))

vi.mock('@/assets/icons/external.svg?react', () => ({
  default: () => null,
}))

const workflowContextValue = { activeIssue: null }

afterEach(cleanup)

const renderPanel = (
  yaml = '',
  props: { onShowVersionHistory?: (visibleYaml: string) => void } = {}
) =>
  render(
    <WorkflowContext.Provider value={workflowContextValue as any}>
      <YamlPanel yaml={yaml} onClose={vi.fn()} {...props} />
    </WorkflowContext.Provider>
  )

describe('YamlPanel tab detection', () => {
  it('shows an error with the line number when a line starts with a tab character', () => {
    renderPanel()

    fireEvent.change(screen.getByTestId('ace-editor'), {
      target: { value: 'key:\n\tvalue: 1' },
    })

    expect(
      screen.getByText(/Tab character found at line 2 — YAML requires spaces for indentation/)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('does not show a tab error when a tab appears only inside a quoted string value', () => {
    renderPanel()

    fireEvent.change(screen.getByTestId('ace-editor'), {
      target: { value: 'key: "foo\tbar"' },
    })

    expect(screen.queryByText(/Tab character found/)).not.toBeInTheDocument()
  })

  it('shows no error for valid YAML without any tab characters', () => {
    renderPanel()

    fireEvent.change(screen.getByTestId('ace-editor'), {
      target: { value: 'key: value\nnested:\n  child: 123' },
    })

    expect(screen.queryByText(/YAML Error/)).not.toBeInTheDocument()
  })
})

describe('YamlPanel version history entry point', () => {
  it('does not render a Version History tab', () => {
    renderPanel('states: []', { onShowVersionHistory: vi.fn() })
    expect(screen.queryByRole('tab', { name: /Version History/i })).not.toBeInTheDocument()
  })

  it('shows Version History button beside the YAML header and invokes callback', () => {
    const onShowVersionHistory = vi.fn()
    renderPanel('states:\n  - id: buffer', { onShowVersionHistory })

    const button = screen.getByRole('button', { name: /Version History \(YAML\)/i })
    fireEvent.click(button)
    expect(onShowVersionHistory).toHaveBeenCalledWith('states:\n  - id: buffer')
  })

  it('hides Version History when callback is not provided (create mode)', () => {
    renderPanel('states: []')
    expect(screen.queryByRole('button', { name: /Version History/i })).not.toBeInTheDocument()
  })
})

describe('YamlPanel header layout', () => {
  it('truncates the title and stacks the actions below it so they stay reachable', () => {
    renderPanel('states: []', { onShowVersionHistory: vi.fn() })

    const title = screen.getByText('YAML Configuration')
    expect(title).toHaveClass('truncate', 'max-w-full')
    expect(title).not.toHaveClass('shrink-0')
    expect(title).toHaveAttribute('title', 'YAML Configuration')
    expect(title.parentElement).toHaveClass('flex-col', 'items-start')
  })

  it('left-aligns the header action buttons', () => {
    renderPanel('states: []', { onShowVersionHistory: vi.fn() })

    const actions = screen.getByRole('button', { name: 'Version History (YAML)' }).parentElement!
    expect(actions).toHaveClass('justify-start', 'ml-0')
    expect(actions).not.toHaveClass('ml-auto')
    expect(actions).not.toHaveClass('justify-end')
  })
})

describe('YamlPanel expand', () => {
  const originalYaml = 'states:\n  - id: a'
  const editedYaml = 'states:\n  - id: b'

  const renderExpandablePanel = () => {
    const ref = React.createRef<YamlPanelRef>()
    const onUpdate = vi.fn()
    const onClose = vi.fn()
    render(
      <WorkflowContext.Provider value={workflowContextValue as any}>
        <YamlPanel ref={ref} yaml={originalYaml} onUpdate={onUpdate} onClose={onClose} />
      </WorkflowContext.Provider>
    )
    return { ref, onUpdate, onClose }
  }

  const expand = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Expand YAML editor' }))
  }

  const collapse = async () => {
    fireEvent.click(screen.getByRole('button', { name: /Collapse/ }))
    await waitFor(() => expect(screen.getAllByTestId('ace-editor')).toHaveLength(1))
  }

  it('opens the YAML Configuration dialog with the same YAML as the inline editor', () => {
    renderExpandablePanel()

    expand()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByText('YAML Configuration').length).toBeGreaterThanOrEqual(2)
    const [inline, expanded] = screen.getAllByTestId('ace-editor')
    expect(expanded).toHaveValue(originalYaml)
    expect(inline).toHaveValue(originalYaml)
  })

  it('keeps edits made in the modal after Collapse and saves them', async () => {
    const { ref, onUpdate } = renderExpandablePanel()

    expand()
    fireEvent.change(screen.getAllByTestId('ace-editor')[1], { target: { value: editedYaml } })
    await collapse()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('ace-editor')).toHaveValue(editedYaml)
    expect(ref.current?.isDirty()).toBe(true)
    await ref.current?.save()
    expect(onUpdate).toHaveBeenCalledWith(editedYaml)
  })

  it('shows the tab error inside the modal and keeps Save disabled after Collapse', async () => {
    renderExpandablePanel()

    expand()
    fireEvent.change(screen.getAllByTestId('ace-editor')[1], {
      target: { value: 'key:\n\tvalue: 1' },
    })
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent(/YAML Error: Tab character found at line 2/)

    fireEvent.click(screen.getByRole('button', { name: /Collapse/ }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('restores the original YAML when Cancel is clicked after an expanded edit', async () => {
    const { ref, onClose } = renderExpandablePanel()

    expand()
    fireEvent.change(screen.getAllByTestId('ace-editor')[1], { target: { value: editedYaml } })
    fireEvent.click(screen.getByRole('button', { name: /Collapse/ }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledWith(true)
    expect(screen.getByTestId('ace-editor')).toHaveValue(originalYaml)
    expect(ref.current?.isDirty()).toBe(false)
  })
})
