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

import WorkflowConfigField from '../WorkflowConfigField'

vi.mock('@/router', () => ({ router: {} }))

vi.mock('@/components/AceEditor/AceEditor', () => ({
  default: ({ value, onChange }: { value: string; onChange?: (v: string) => void }) => (
    <textarea data-testid="ace-editor" value={value} onChange={(e) => onChange?.(e.target.value)} />
  ),
}))

vi.mock('@/assets/icons/history.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/external.svg?react', () => ({ default: () => null }))

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return { ...actual, useSnapshot: (s: unknown) => s }
})

vi.mock('@/store/appInfo', () => ({
  appInfoStore: { configs: [] },
}))

const mockIsEnabled = vi.fn((): boolean => false)
const mockGetSettings = vi.fn((): { url?: string } | null => null)

vi.mock('@/utils/settings', () => ({
  isConfigItemEnabled: () => mockIsEnabled(),
  getConfigItemSettings: () => mockGetSettings(),
}))

describe('WorkflowConfigField version history entry point', () => {
  it('does not render a Version History tab', () => {
    render(
      <WorkflowConfigField value="states: []" onChange={vi.fn()} onShowVersionHistory={vi.fn()} />
    )
    expect(screen.queryByRole('tab', { name: /Version History/i })).not.toBeInTheDocument()
  })

  it('shows Version History and passes visible yaml to callback', () => {
    const onShowVersionHistory = vi.fn()
    const yaml = ['states:', '  - id: unsaved'].join('\n')
    render(
      <WorkflowConfigField
        value={yaml}
        onChange={vi.fn()}
        onShowVersionHistory={onShowVersionHistory}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Version History \(legacy editor\)/i }))
    expect(onShowVersionHistory).toHaveBeenCalledWith(yaml)
  })

  it('shows Version History even when Documentation is hidden', () => {
    mockIsEnabled.mockReturnValue(false)
    mockGetSettings.mockReturnValue(null)
    render(
      <WorkflowConfigField value="states: []" onChange={vi.fn()} onShowVersionHistory={vi.fn()} />
    )
    expect(screen.queryByText('Documentation')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Version History \(legacy editor\)/i })
    ).toBeInTheDocument()
  })

  it('hides Version History when callback is absent (create mode)', () => {
    render(<WorkflowConfigField value="states: []" onChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /Version History/i })).not.toBeInTheDocument()
  })
})
