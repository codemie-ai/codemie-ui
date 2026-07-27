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

import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'

import { WorkflowContext } from '@/pages/workflows/editor/hooks/useWorkflowContext'

import YamlPanel from '../YamlPanel'

vi.mock('@/components/AceEditor/AceEditor', () => ({
  default: React.forwardRef(
    ({ value, onChange }: { value: string; onChange?: (v: string) => void }, ref: any) => {
      React.useImperativeHandle(ref, () => ({ editor: null, jumpToLine: vi.fn() }))
      return (
        <textarea
          data-testid="ace-editor"
          defaultValue={value}
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

const renderPanel = (yaml = '') =>
  render(
    <WorkflowContext.Provider value={workflowContextValue as any}>
      <YamlPanel yaml={yaml} onClose={vi.fn()} />
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
