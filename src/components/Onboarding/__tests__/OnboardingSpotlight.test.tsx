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

import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getElementPosition } from '@/utils/onboarding'

import { OnboardingSpotlight } from '../OnboardingSpotlight'

vi.mock('@/utils/onboarding', () => ({
  getElementPosition: vi.fn(),
}))
vi.mock('@/utils/tailwindColors', () => ({
  getTailwindColor: vi.fn(() => '#9E00FF'),
}))

const mockGetElementPosition = vi.mocked(getElementPosition)

const FOUND_POSITION = { top: 10, left: 20, width: 100, height: 50 }

describe('OnboardingSpotlight', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when target element is not found', () => {
    mockGetElementPosition.mockReturnValue(null)
    const { container } = render(<OnboardingSpotlight target="[data-missing]" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the spotlight div when target element is found', () => {
    mockGetElementPosition.mockReturnValue(FOUND_POSITION)
    const { container } = render(<OnboardingSpotlight target="[data-found]" />)
    expect(container.firstChild).not.toBeNull()
  })

  it('clears stale position when target prop changes to a selector whose element is absent', () => {
    // First render: element found → spotlight visible
    mockGetElementPosition.mockReturnValue(FOUND_POSITION)
    const { container, rerender } = render(<OnboardingSpotlight target="[data-analytics]" />)
    expect(container.firstChild).not.toBeNull()

    // Rerender with new target whose element is absent
    mockGetElementPosition.mockReturnValue(null)
    rerender(<OnboardingSpotlight target="[data-prebuilt-assistants]" />)

    // Stale analytics spotlight must be gone
    expect(container.firstChild).toBeNull()
  })
})
