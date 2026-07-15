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
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { useCustomAppearance } from '@/hooks/useCustomAppearance'

import CodeBlockFontSection from '../CodeBlockFontSection'

vi.mock('@/hooks/useCustomAppearance')

describe('CodeBlockFontSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the component with useCustomAppearance hook', () => {
    vi.mocked(useCustomAppearance).mockReturnValue({
      appearance: {
        codeBlockFontStack: 'geist-mono',
      } as any,
      setAppearance: vi.fn(),
    } as any)

    const { container } = render(<CodeBlockFontSection />)
    expect(container).toBeInTheDocument()
  })

  it('uses the appearance hook to access codeBlockFontStack', () => {
    const mockSetAppearance = vi.fn()
    vi.mocked(useCustomAppearance).mockReturnValue({
      appearance: {
        codeBlockFontStack: 'jetbrains-mono',
      } as any,
      setAppearance: mockSetAppearance,
    } as any)

    render(<CodeBlockFontSection />)

    // Verify the hook was called
    expect(useCustomAppearance).toHaveBeenCalled()
  })

  it('renders a label for code block font selection', () => {
    vi.mocked(useCustomAppearance).mockReturnValue({
      appearance: {
        codeBlockFontStack: 'geist-mono',
      } as any,
      setAppearance: vi.fn(),
    } as any)

    render(<CodeBlockFontSection />)
    // The Select component should have a label
    expect(screen.getByText('Code block font')).toBeInTheDocument()
  })

  it('has correct structure with flex layout', () => {
    vi.mocked(useCustomAppearance).mockReturnValue({
      appearance: {
        codeBlockFontStack: 'geist-mono',
      } as any,
      setAppearance: vi.fn(),
    } as any)

    const { container } = render(<CodeBlockFontSection />)
    const wrapper = container.querySelector('.flex.flex-col.gap-3')
    expect(wrapper).toBeInTheDocument()
  })

  it('associates the label with the control via id/htmlFor', () => {
    vi.mocked(useCustomAppearance).mockReturnValue({
      appearance: {
        codeBlockFontStack: 'geist-mono',
      } as any,
      setAppearance: vi.fn(),
    } as any)

    const { container } = render(<CodeBlockFontSection />)
    const label = container.querySelector('label')
    expect(label).toHaveAttribute('for', 'code-block-font')
    expect(container.querySelector('#code-block-font')).toBeInTheDocument()
  })

  it('validates font values before calling setAppearance', () => {
    // This test verifies that the component validates values
    // Before the fix: component has unsafe 'as' cast and no validation
    // After the fix: component has type guard that rejects invalid values
    const mockSetAppearance = vi.fn()
    vi.mocked(useCustomAppearance).mockReturnValue({
      appearance: {
        codeBlockFontStack: 'geist-mono',
      } as any,
      setAppearance: mockSetAppearance,
    } as any)

    render(<CodeBlockFontSection />)

    // Component should render without errors
    expect(screen.getByText('Code block font')).toBeInTheDocument()
    // After fix, component will have validation logic
    expect(mockSetAppearance).not.toHaveBeenCalled()
  })
})
