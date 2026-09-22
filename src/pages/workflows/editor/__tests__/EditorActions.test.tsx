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

import { TAB_DATA } from '../constants'
import EditorActions from '../EditorActions'

vi.mock('valtio', () => ({
  useSnapshot: () => ({ configs: [] }),
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: {},
}))

vi.mock('../hooks/useWorkflowContext', () => ({
  useWorkflowContext: () => ({ issues: null }),
}))

vi.mock('@/utils/settings', () => ({
  isConfigItemEnabled: () => false,
  getConfigItemSettings: () => null,
}))

afterEach(cleanup)

describe('EditorActions', () => {
  const defaultProps = {
    isFullscreen: true,
    canUndo: false,
    hasValidationErrors: false,
    onUndo: vi.fn(),
    onBeautify: vi.fn(),
    tabs: [],
    toggleTabs: vi.fn(),
  }

  it('renders Version History after Beautify when onShowVisualVersionHistory is provided', () => {
    render(<EditorActions {...defaultProps} onShowVisualVersionHistory={vi.fn()} />)

    const buttons = screen.getAllByRole('button')
    const beautifyIndex = buttons.findIndex((btn) => btn.textContent?.includes('Beautify'))
    const versionHistoryIndex = buttons.findIndex((btn) =>
      btn.textContent?.includes('Version History')
    )

    expect(beautifyIndex).toBeGreaterThanOrEqual(0)
    expect(versionHistoryIndex).toBeGreaterThan(beautifyIndex)
  })

  it('calls onShowVisualVersionHistory when the toolbar button is clicked', () => {
    const onShowVisualVersionHistory = vi.fn()
    render(
      <EditorActions {...defaultProps} onShowVisualVersionHistory={onShowVisualVersionHistory} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Version History (visual editor)' }))
    expect(onShowVisualVersionHistory).toHaveBeenCalledTimes(1)
  })

  it('does not disable Version History when the YAML panel is open', () => {
    render(
      <EditorActions
        {...defaultProps}
        tabs={[TAB_DATA.YAML.ID]}
        onShowVisualVersionHistory={vi.fn()}
      />
    )

    expect(
      screen.getByRole('button', { name: 'Version History (visual editor)' })
    ).not.toBeDisabled()
  })
})
