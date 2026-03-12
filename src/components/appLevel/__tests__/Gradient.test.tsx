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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import Gradient from '../Gradient'

vi.mock('@/utils/helpers', () => ({
  getSidebarMaxWidthClass: vi.fn(() => 'max-w-sidebar-expanded'),
}))

const { getSidebarMaxWidthClass } = vi.mocked(await import('@/utils/helpers'))

describe('Gradient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<Gradient />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('applies sidebar max width class from helper', () => {
      getSidebarMaxWidthClass.mockReturnValue('max-w-custom')
      const { container } = render(<Gradient />)
      const gradientContainer = container.firstChild as HTMLElement
      expect(getSidebarMaxWidthClass).toHaveBeenCalled()
      expect(gradientContainer).toHaveClass('max-w-custom')
    })
  })

  describe('gradient images', () => {
    it('renders two gradient images', () => {
      const { container } = render(<Gradient />)
      const images = container.querySelectorAll('img')
      expect(images).toHaveLength(2)
    })

    it('renders light theme gradient image', () => {
      const { container } = render(<Gradient />)
      const images = container.querySelectorAll('img')
      const lightImage = images[0]
      expect(lightImage).toHaveAttribute('alt', 'background-gradient')
      expect(lightImage).toHaveClass('codemieLight:hidden')
    })

    it('renders dark theme gradient image', () => {
      const { container } = render(<Gradient />)
      const images = container.querySelectorAll('img')
      const darkImage = images[1]
      expect(darkImage).toHaveAttribute('alt', 'background-gradient')
      expect(darkImage).toHaveClass('min-w-[600px]')
      expect(darkImage).toHaveClass('codemieDark:hidden')
    })

    it('both images have alt text for accessibility', () => {
      const { container } = render(<Gradient />)
      const images = container.querySelectorAll('img')
      images.forEach((img) => {
        expect(img).toHaveAttribute('alt', 'background-gradient')
      })
    })

    it('both images have source attributes', () => {
      const { container } = render(<Gradient />)
      const images = container.querySelectorAll('img')
      images.forEach((img) => {
        expect(img).toHaveAttribute('src')
        expect(img.getAttribute('src')).toBeTruthy()
      })
    })
  })

  describe('theme-specific visibility', () => {
    it('light gradient is hidden in light theme', () => {
      const { container } = render(<Gradient />)
      const lightImage = container.querySelectorAll('img')[0]
      expect(lightImage).toHaveClass('codemieLight:hidden')
    })

    it('dark gradient is hidden in dark theme', () => {
      const { container } = render(<Gradient />)
      const darkImage = container.querySelectorAll('img')[1]
      expect(darkImage).toHaveClass('codemieDark:hidden')
    })
  })

  it('updates when sidebar width class changes', () => {
    getSidebarMaxWidthClass.mockReturnValue('max-w-sidebar-collapsed')
    const { container, rerender } = render(<Gradient />)
    let gradientContainer = container.firstChild as HTMLElement
    expect(gradientContainer).toHaveClass('max-w-sidebar-collapsed')

    getSidebarMaxWidthClass.mockReturnValue('max-w-sidebar-expanded')
    rerender(<Gradient />)
    gradientContainer = container.firstChild as HTMLElement
    expect(gradientContainer).toHaveClass('max-w-sidebar-expanded')
  })

  it('calls getSidebarMaxWidthClass on every render', () => {
    getSidebarMaxWidthClass.mockClear()
    const { rerender } = render(<Gradient />)
    expect(getSidebarMaxWidthClass).toHaveBeenCalledTimes(1)

    rerender(<Gradient />)
    expect(getSidebarMaxWidthClass).toHaveBeenCalledTimes(2)
  })
})
