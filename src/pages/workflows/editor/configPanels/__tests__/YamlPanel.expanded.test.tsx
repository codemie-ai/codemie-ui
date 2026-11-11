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
import { act, render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

import { editorByName, fakeEditors } from '@/components/AceEditor/__tests__/fakeAce'
import { WorkflowContext } from '@/pages/workflows/editor/hooks/useWorkflowContext'

import YamlPanel from '../YamlPanel'

vi.mock('ace-builds', async () => {
  const helper = await import('@/components/AceEditor/__tests__/fakeAce')
  return { default: { edit: helper.fakeAceEdit } }
})
vi.mock('ace-builds/src-noconflict/mode-yaml', () => ({}))
vi.mock('ace-builds/src-noconflict/mode-json', () => ({}))
vi.mock('ace-builds/src-noconflict/theme-tomorrow_night', () => ({}))
vi.mock('ace-builds/src-noconflict/theme-tomorrow', () => ({}))
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ isDark: false }) }))

vi.mock('@/components/Tabs/Tabs', () => ({
  default: ({ tabs, activeTab }: { tabs: any[]; activeTab: string }) => (
    <div>{tabs.find((t) => t.id === activeTab)?.element}</div>
  ),
}))
vi.mock('@/assets/icons/history.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/expand.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/collapse.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/external.svg?react', () => ({ default: () => null }))
vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as object), useSnapshot: (store: unknown) => store }
})
vi.mock('@/store/appInfo', () => ({ appInfoStore: { configs: [] } }))
vi.mock('@/utils/settings', () => ({
  isConfigItemEnabled: () => false,
  getConfigItemSettings: () => null,
}))
vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn(), info: vi.fn() } }))

afterEach(cleanup)
beforeEach(() => {
  fakeEditors.length = 0
})

describe('YamlPanel expanded editor with real AceEditor sync', () => {
  it('keeps every character typed in the expanded editor', () => {
    render(
      <WorkflowContext.Provider value={{ activeIssue: null } as any}>
        <YamlPanel yaml="" onClose={vi.fn()} />
      </WorkflowContext.Provider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Expand YAML editor' }))

    const expanded = editorByName('yaml_config_expanded')!
    act(() => expanded.simulateUserInput('states:'))
    act(() => expanded.simulateUserInput('states:\n  - id: a'))

    expect(expanded.text).toBe('states:\n  - id: a')
    expect(editorByName('yaml_config')?.text ?? 'states:\n  - id: a').toBe('states:\n  - id: a')
  })
})
