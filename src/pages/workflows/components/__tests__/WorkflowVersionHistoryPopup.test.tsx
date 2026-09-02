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

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { WorkflowConfigHistoryItem } from '@/types/entity/workflow'

import WorkflowVersionHistoryPopup from '../WorkflowVersionHistoryPopup'

vi.mock('@/router', () => ({ router: {} }))

const historyFixture: WorkflowConfigHistoryItem[] = [
  {
    date: '2026-08-10T12:00:00+00:00',
    yaml_config: 'states: []\n# prior-2',
    created_by: { user_id: 'u2', username: 'bob', name: 'Bob' },
  },
  {
    date: '2026-08-09T12:00:00+00:00',
    yaml_config: 'states: []\n# prior-1',
    created_by: { user_id: 'u3', username: 'carol', name: 'Carol' },
  },
]

vi.mock('@/components/Popup', () => ({
  default: ({ visible, children, headerContent }: any) =>
    visible ? (
      <div data-testid="popup">
        {headerContent}
        {children}
      </div>
    ) : null,
}))

vi.mock('@/components/form/VersionedField/VersionedFieldHistoryTab', () => ({
  default: ({
    children,
    options,
    onRestore,
    canRestore,
    emptyPlaceholder,
    onOptionChange,
    selectedOption,
  }: any) => (
    <div data-testid="history-tab">
      {options.length === 0 ? (
        <p>{emptyPlaceholder}</p>
      ) : (
        <>
          <select
            aria-label="Select a version"
            value={selectedOption ?? ''}
            onChange={(e) => onOptionChange(e.target.value)}
          >
            {options.map((o: any) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {canRestore !== false && (
            <button type="button" onClick={onRestore}>
              Restore
            </button>
          )}
          {children}
        </>
      )}
    </div>
  ),
}))

vi.mock('@/components/form/VersionedField/VersionHistoryDiffView', () => ({
  default: ({ historyText, currentText, previousHistoryText, title }: any) => (
    <div data-testid="diff-view">
      <span data-testid="diff-title">{title}</span>
      <span data-testid="diff-history">{historyText}</span>
      <span data-testid="diff-current">{currentText}</span>
      <span data-testid="diff-previous">{previousHistoryText ?? ''}</span>
    </div>
  ),
}))

describe('WorkflowVersionHistoryPopup', () => {
  it('builds FE labels from history length minus index and selects the newest prior', async () => {
    render(
      <WorkflowVersionHistoryPopup
        visible
        canWrite
        currentEditorYaml="editor-yaml"
        history={historyFixture}
        onHide={vi.fn()}
        onRestore={vi.fn()}
      />
    )

    const select = await screen.findByLabelText('Select a version')
    expect(select).toHaveValue('2026-08-10T12:00:00+00:00::0')
    expect(screen.getByRole('option', { name: /\[02\]/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /\[01\]/ })).toBeInTheDocument()
  })

  it('diffs selected history YAML against current editor YAML and the next-older entry', async () => {
    render(
      <WorkflowVersionHistoryPopup
        visible
        canWrite
        currentEditorYaml="unsaved-editor-yaml"
        history={historyFixture}
        onHide={vi.fn()}
        onRestore={vi.fn()}
      />
    )

    expect(await screen.findByTestId('diff-current')).toHaveTextContent('unsaved-editor-yaml')
    expect(screen.getByTestId('diff-history')).toHaveTextContent('states: [] # prior-2')
    expect(screen.getByTestId('diff-previous')).toHaveTextContent('states: [] # prior-1')
  })

  it('hides Restore for READ users', async () => {
    render(
      <WorkflowVersionHistoryPopup
        visible
        canWrite={false}
        currentEditorYaml="editor-yaml"
        history={historyFixture}
        onHide={vi.fn()}
        onRestore={vi.fn()}
      />
    )

    await screen.findByTestId('diff-view')
    expect(screen.queryByRole('button', { name: 'Restore' })).not.toBeInTheDocument()
  })

  it('restores selected yaml_config into the parent without a versions summary', async () => {
    const onRestore = vi.fn()
    render(
      <WorkflowVersionHistoryPopup
        visible
        canWrite
        currentEditorYaml="editor-yaml"
        history={historyFixture}
        onHide={vi.fn()}
        onRestore={onRestore}
      />
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Restore' }))
    expect(onRestore).toHaveBeenCalledWith('states: []\n# prior-2')
  })

  it('shows empty state when history is empty', async () => {
    render(
      <WorkflowVersionHistoryPopup
        visible
        canWrite
        currentEditorYaml="editor-yaml"
        history={[]}
        onHide={vi.fn()}
        onRestore={vi.fn()}
      />
    )

    expect(await screen.findByText(/No version history available/i)).toBeInTheDocument()
  })
})
