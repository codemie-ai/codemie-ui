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

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { WorkflowConfigHistoryItem } from '@/types/entity/workflow'
import toaster from '@/utils/toaster'

import WorkflowVisualVersionHistoryPopup, {
  type WorkflowVisualVersionHistoryPopupProps,
} from '../WorkflowVisualVersionHistoryPopup'

vi.mock('@/router', () => ({ router: {} }))

const VALID_YAML = 'states: []\n'

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
  default: ({ visible, children, header }: any) =>
    visible ? (
      <div data-testid="popup">
        {header}
        {children}
      </div>
    ) : null,
}))

vi.mock('@/components/form/VersionedField/VersionedFieldHistoryTab', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('@/components/form/VersionedField/VersionedFieldHistoryTab')
  >()

  return {
    ...actual,
    default: ({
      children,
      options,
      onRestore,
      canRestore,
      emptyPlaceholder,
      onOptionChange,
      selectedOption,
      banner,
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
            {banner === undefined ? (
              <p>
                Review the changes below. Lines highlighted in red will be removed, lines in green
                will be added.
              </p>
            ) : (
              banner
            )}
            {children}
          </>
        )}
      </div>
    ),
  }
})

vi.mock('../WorkflowVisualDiffView', () => ({
  default: function MockWorkflowVisualDiffView() {
    return <div data-testid="visual-diff-view" />
  },
}))

afterEach(() => {
  cleanup()
  vi.mocked(toaster.error).mockClear()
})

const renderPopup = (overrides: Partial<WorkflowVisualVersionHistoryPopupProps> = {}) =>
  render(
    <WorkflowVisualVersionHistoryPopup
      visible
      canWrite
      currentEditorYaml={VALID_YAML}
      history={historyFixture}
      onHide={vi.fn()}
      onRestore={vi.fn()}
      {...overrides}
    />
  )

describe('WorkflowVisualVersionHistoryPopup', () => {
  it('shows the diff legend whenever history is available', async () => {
    renderPopup()

    expect(await screen.findByTestId('diff-legend')).toBeInTheDocument()
    expect(screen.queryByText(/Review the changes below/)).not.toBeInTheDocument()
  })

  it('keeps the legend visible when the visual canvas reports no node or edge diff', async () => {
    renderPopup()

    await screen.findByTestId('visual-diff-view')
    expect(screen.getByTestId('diff-legend')).toBeInTheDocument()
  })

  it('keeps the legend visible while a different version is being compared', async () => {
    renderPopup()

    expect(await screen.findByTestId('diff-legend')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Select a version'), {
      target: { value: `${historyFixture[1].date}::1` },
    })

    expect(screen.getByTestId('diff-legend')).toBeInTheDocument()
  })

  it('hides Restore when the selected history row has a null yaml_config', async () => {
    renderPopup({
      history: [
        {
          ...historyFixture[0],
          yaml_config: null as unknown as string,
        },
      ],
    })

    await screen.findByLabelText('Select a version')
    expect(screen.queryByRole('button', { name: 'Restore' })).not.toBeInTheDocument()
  })

  it('hides Restore for a read-only user even when the selected version can be restored', async () => {
    renderPopup({ canWrite: false })

    await screen.findByLabelText('Select a version')
    expect(screen.queryByRole('button', { name: 'Restore' })).not.toBeInTheDocument()
  })

  it('mounts the visual canvas when both YAML strings parse', async () => {
    renderPopup()

    expect(await screen.findByTestId('visual-diff-view')).toBeInTheDocument()
  })

  it('restores selected yaml_config into the parent', async () => {
    const onRestore = vi.fn()
    renderPopup({ onRestore })

    fireEvent.click(await screen.findByRole('button', { name: 'Restore' }))
    expect(onRestore).toHaveBeenCalledWith('states: []\n# prior-2')
  })

  it('hides the legend and shows selected-parse copy without toasting or YAML text diff', async () => {
    renderPopup({
      history: [{ ...historyFixture[0], yaml_config: '{{{' }],
    })

    expect(await screen.findByText('Could not parse the selected version YAML')).toBeInTheDocument()
    expect(screen.queryByTestId('diff-legend')).not.toBeInTheDocument()
    expect(screen.queryByTestId('visual-diff-view')).not.toBeInTheDocument()
    expect(screen.queryByText(/Review the changes below/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument()
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it('hides the legend and shows selected-empty copy while Restore stays available', async () => {
    renderPopup({
      history: [{ ...historyFixture[0], yaml_config: '' }],
    })

    expect(await screen.findByText('Selected version YAML is empty')).toBeInTheDocument()
    expect(screen.queryByTestId('diff-legend')).not.toBeInTheDocument()
    expect(screen.queryByTestId('visual-diff-view')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument()
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it('hides the legend and shows editor-parse copy without toasting', async () => {
    renderPopup({ currentEditorYaml: '{{{' })

    expect(await screen.findByText('Could not parse the current editor YAML')).toBeInTheDocument()
    expect(screen.queryByTestId('diff-legend')).not.toBeInTheDocument()
    expect(screen.queryByTestId('visual-diff-view')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument()
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it('hides the legend and shows editor-empty copy without toasting', async () => {
    renderPopup({ currentEditorYaml: '' })

    expect(await screen.findByText('Current editor YAML is empty')).toBeInTheDocument()
    expect(screen.queryByTestId('diff-legend')).not.toBeInTheDocument()
    expect(screen.queryByTestId('visual-diff-view')).not.toBeInTheDocument()
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it('hides the legend and shows graph copy when the visual graph cannot be built', async () => {
    renderPopup({
      history: [{ ...historyFixture[0], yaml_config: 'states: not-an-array\n' }],
    })

    expect(await screen.findByText('Could not build the visual graph')).toBeInTheDocument()
    expect(screen.queryByTestId('diff-legend')).not.toBeInTheDocument()
    expect(screen.queryByTestId('visual-diff-view')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument()
    expect(toaster.error).not.toHaveBeenCalled()
  })
})
