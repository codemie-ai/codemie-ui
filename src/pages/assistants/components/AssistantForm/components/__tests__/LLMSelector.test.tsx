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

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import LLMSelector from '../LLMSelector'

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

describe('LLMSelector premium badge', () => {
  it('renders Premium badge on the selected premium model', () => {
    render(<LLMSelector value="claude-opus-4-1" onChange={vi.fn()} allowEmpty />)

    expect(screen.getAllByText('Premium').length).toBeGreaterThan(0)
  })

  it('renders no Premium badge for a standard selection', () => {
    render(<LLMSelector value="gpt-4o" onChange={vi.fn()} allowEmpty />)

    expect(screen.queryByText('Premium')).not.toBeInTheDocument()
  })
})
