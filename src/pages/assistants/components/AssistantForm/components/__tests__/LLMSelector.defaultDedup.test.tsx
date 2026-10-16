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

import { fireEvent, render as rtlRender, screen } from '@testing-library/react'
import { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import LLMSelector from '../LLMSelector'

const render = (ui: ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>)

const { mockAppInfoStore } = vi.hoisted(() => ({
  mockAppInfoStore: {
    llmModels: [
      { label: 'GPT-4o', value: 'gpt-4o', isDefault: false },
      {
        label: 'Bedrock Claude Opus 4.5',
        value: 'bedrock-claude-opus-4-5',
        isDefault: true,
        isPremium: true,
      },
    ],
    llmRouters: [],
    imageGenerationModels: [],
    getLLMModels: vi.fn(),
    getImageGenerationModels: vi.fn(),
  },
}))

vi.mock('valtio', () => ({
  proxy: (obj: unknown) => obj,
  useSnapshot: vi.fn(() => mockAppInfoStore),
  subscribe: vi.fn(),
}))
vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))
vi.mock('@/hooks/useIsTruncated', () => ({ useIsTruncated: () => false }))

beforeEach(() => {
  mockAppInfoStore.llmModels = [
    { label: 'GPT-4o', value: 'gpt-4o', isDefault: false },
    {
      label: 'Bedrock Claude Opus 4.5',
      value: 'bedrock-claude-opus-4-5',
      isDefault: true,
      isPremium: true,
    },
  ]
})

const openPanel = (props: Partial<Parameters<typeof LLMSelector>[0]> = {}) => {
  const { container } = render(
    <LLMSelector
      placeholder="Select model"
      value="bedrock-claude-opus-4-5"
      onChange={vi.fn()}
      {...props}
    />
  )
  fireEvent.click(container.querySelector('.p-multiselect')!)
  return container
}

// AC1 + AC3: the premium default model appears once, and that one row carries
// the Premium label — not split across a label-only "Default:" row and a
// separately-labeled plain row.
describe('LLMSelector — default model dedup (EPMCDME-15923)', () => {
  it('renders the premium default model exactly once, with the Premium label on it', () => {
    openPanel()

    const rows = screen
      .getAllByTestId('llm-option-row')
      .filter((row) => row.textContent?.includes('Bedrock Claude Opus 4.5'))

    expect(rows).toHaveLength(1)
    expect(rows[0].querySelector('[data-testid="llm-option-meta"]')?.textContent).toBe('Premium')
  })

  it('marks that single row as the default', () => {
    openPanel()

    const row = screen
      .getAllByTestId('llm-option-row')
      .find((r) => r.textContent?.includes('Bedrock Claude Opus 4.5'))!

    expect(row.textContent).toContain('Default')
  })

  // AC4: the non-default model keeps rendering once with no meta line — a fix
  // that dedupes by always stripping isPremium/isRouter from every row, instead
  // of only reshaping the default row, would make this fail by accident.
  it('renders the non-default model exactly once with no Premium/Router label', () => {
    openPanel()

    const rows = screen
      .getAllByTestId('llm-option-row')
      .filter((row) => row.textContent === 'GPT-4o')
    expect(rows).toHaveLength(1)
    expect(rows[0].querySelector('[data-testid="llm-option-meta"]')).toBeNull()
  })

  // AC5: PrimeReact's built-in filter (LLMSelector passes a no-op onFilter, which
  // only turns the search box on) matches against the option label. One row per
  // model means a name search can only ever find one match.
  it('returns exactly one match when searching the dropdown by the default model name', () => {
    openPanel()

    const search = screen.getByPlaceholderText('Search')
    fireEvent.change(search, { target: { value: 'Bedrock Claude Opus' } })

    const rows = screen
      .getAllByTestId('llm-option-row')
      .filter((row) => row.textContent?.includes('Bedrock Claude Opus 4.5'))
    expect(rows).toHaveLength(1)
  })

  // Guards the fallback branch: when no model has isDefault: true, defaultLlmModel
  // falls back to models[0] (LLMSelector.tsx:174-178) — dedup must still key off
  // defaultLlmModel.value, not off isDefault, or the fallback row duplicates too.
  it('also dedupes when the default comes from the models[0] fallback (no isDefault: true in the list)', () => {
    mockAppInfoStore.llmModels = [
      { label: 'GPT-4o', value: 'gpt-4o', isDefault: false },
      {
        label: 'Bedrock Claude Opus 4.5',
        value: 'bedrock-claude-opus-4-5',
        isDefault: false,
        isPremium: true,
      },
    ]

    openPanel({ value: 'gpt-4o' })

    const rows = screen
      .getAllByTestId('llm-option-row')
      .filter((row) => row.textContent?.includes('GPT-4o'))
    expect(rows).toHaveLength(1)
  })

  // CR-001: when the resolved default model's value is falsy (e.g. ''), the
  // synthetic "Default: X" row is skipped by the `defaultLlmModel?.value`
  // truthiness check (LLMSelector.tsx:183), but the regular-list filter must
  // not then remove that same model by strict equality — or it vanishes from
  // the dropdown entirely instead of still rendering once as a plain row.
  it('still renders a default model with a falsy value once as a plain row, not zero times', () => {
    mockAppInfoStore.llmModels = [
      { label: 'Legacy', value: '', isDefault: true },
      { label: 'GPT-4o', value: 'gpt-4o', isDefault: false },
    ]

    openPanel({ value: 'gpt-4o' })

    const rows = screen
      .getAllByTestId('llm-option-row')
      .filter((row) => row.textContent === 'Legacy')
    expect(rows).toHaveLength(1)
  })
})

// MultiSelect's own sort (src/components/form/MultiSelect/MultiSelect.tsx:298-308)
// alphabetizes options and floats only the *currently selected* value to the
// top — so once a user picks a non-default model, "Default: X" loses its
// selected status and falls back to its alphabetical slot. The default row
// must stay first regardless of what is currently selected.
describe('LLMSelector — default row always sorts first (EPMCDME-15923 follow-up)', () => {
  beforeEach(() => {
    mockAppInfoStore.llmModels = [
      { label: 'Anthropic Claude', value: 'anthropic-claude', isDefault: false },
      { label: 'Bedrock Claude Opus 4.5', value: 'bedrock-claude-opus-4-5', isDefault: true },
      { label: 'GPT-4o', value: 'gpt-4o', isDefault: false },
    ]
  })

  it('keeps the default row first when a non-default, alphabetically-earlier model is selected', () => {
    openPanel({ value: 'anthropic-claude' })

    const rows = screen.getAllByTestId('llm-option-row')
    expect(rows[0].textContent).toContain('Default')
    expect(rows[0].textContent).toContain('Bedrock Claude Opus 4.5')
  })

  it('still shows the default row first with no selection at all', () => {
    openPanel({ value: '' })

    const rows = screen.getAllByTestId('llm-option-row')
    expect(rows[0].textContent).toContain('Default')
  })
})
