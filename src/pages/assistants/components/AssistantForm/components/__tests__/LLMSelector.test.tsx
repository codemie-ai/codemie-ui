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

import { render as rtlRender, screen } from '@testing-library/react'
import { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import LLMSelector from '../LLMSelector'

// The premium note links to the models catalog, so the selector needs the router
// context the app always provides.
const render = (ui: ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>)

const { mockAppInfoStore } = vi.hoisted(() => ({
  mockAppInfoStore: {
    llmModels: [
      { label: 'Claude Opus 4.1', value: 'claude-opus-4-1', isDefault: false, isPremium: true },
      { label: 'GPT-4o', value: 'gpt-4o', isDefault: true },
    ],
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

// The indication itself is unchanged — a premium selection says so on the closed
// surface and a standard one says nothing. Only the wording moved: the badge
// became a `Premium model` note under the field.
describe('LLMSelector premium indication', () => {
  it('names the selected premium model on the closed surface', () => {
    render(<LLMSelector value="claude-opus-4-1" onChange={vi.fn()} allowEmpty />)

    expect(screen.getByText('Premium model')).toBeInTheDocument()
  })

  it('renders no premium indication for a standard selection', () => {
    render(<LLMSelector value="gpt-4o" onChange={vi.fn()} allowEmpty />)

    expect(screen.queryByText('Premium model')).not.toBeInTheDocument()
  })
})
