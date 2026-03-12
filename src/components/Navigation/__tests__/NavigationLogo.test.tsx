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

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import NavigationLogo from '../NavigationLogo'

vi.hoisted(() => vi.resetModules())

const { mockUseTheme } = vi.hoisted(() => {
  return {
    mockUseTheme: {
      isDark: true,
      theme: 'codemieDark',
      setTheme: vi.fn(),
    },
  }
})

vi.mock('@/hooks/useTheme', () => ({
  useTheme: vi.fn(() => mockUseTheme),
}))

vi.mock('@/assets/images/logo-full-dark.svg?react', () => ({
  default: (props: any) => <svg data-testid="logo-dark" {...props} />,
}))

vi.mock('@/assets/images/logo-full-light.svg?react', () => ({
  default: (props: any) => <svg data-testid="logo-light" {...props} />,
}))

describe('NavigationLogo', () => {
  const mockOnClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTheme.isDark = true
  })

  describe('basic rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<NavigationLogo isExpanded={false} onClick={mockOnClick} />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders as an anchor element', () => {
      const { container } = render(<NavigationLogo isExpanded={false} onClick={mockOnClick} />)
      const logo = container.querySelector('a')
      expect(logo).toBeInTheDocument()
    })

    it('renders with correct base styles', () => {
      const { container } = render(<NavigationLogo isExpanded={false} onClick={mockOnClick} />)
      const logo = container.querySelector('a')
      expect(logo).toHaveClass('h-12')
      expect(logo).toHaveClass('cursor-pointer')
      expect(logo).toHaveClass('select-none')
    })
  })

  describe('theme-based logo rendering', () => {
    it('renders dark logo when theme is dark', () => {
      mockUseTheme.isDark = true
      render(<NavigationLogo isExpanded={false} onClick={mockOnClick} />)
      expect(screen.getByTestId('logo-dark')).toBeInTheDocument()
      expect(screen.queryByTestId('logo-light')).not.toBeInTheDocument()
    })

    it('renders light logo when theme is light', () => {
      mockUseTheme.isDark = false
      render(<NavigationLogo isExpanded={false} onClick={mockOnClick} />)
      expect(screen.getByTestId('logo-light')).toBeInTheDocument()
      expect(screen.queryByTestId('logo-dark')).not.toBeInTheDocument()
    })
  })

  describe('expansion state', () => {
    it('applies correct width class when expanded', () => {
      const { container } = render(<NavigationLogo isExpanded={true} onClick={mockOnClick} />)
      const logoContainer = container.querySelector('div')
      expect(logoContainer).toHaveClass('w-[156px]')
    })

    it('applies correct width class when collapsed', () => {
      const { container } = render(<NavigationLogo isExpanded={false} onClick={mockOnClick} />)
      const logoContainer = container.querySelector('div')
      expect(logoContainer).toHaveClass('w-[39px]')
    })
  })

  describe('tooltip behavior', () => {
    it('adds tooltip attributes when collapsed', () => {
      const { container } = render(<NavigationLogo isExpanded={false} onClick={mockOnClick} />)
      const logo = container.querySelector('a')
      expect(logo).toHaveAttribute('data-tooltip-id', 'react-tooltip')
      expect(logo).toHaveAttribute('data-tooltip-content', 'EPAM AI/Run')
      expect(logo).toHaveAttribute('data-tooltip-place', 'right')
    })

    it('does not add tooltip attributes when expanded', () => {
      const { container } = render(<NavigationLogo isExpanded={true} onClick={mockOnClick} />)
      const logo = container.querySelector('a')
      expect(logo).not.toHaveAttribute('data-tooltip-id')
      expect(logo).not.toHaveAttribute('data-tooltip-content')
    })

    it('always has tooltip place attribute', () => {
      const { container } = render(<NavigationLogo isExpanded={false} onClick={mockOnClick} />)
      const logo = container.querySelector('a')
      expect(logo).toHaveAttribute('data-tooltip-place', 'right')
    })
  })

  describe('click handling', () => {
    it('calls onClick when clicked', () => {
      const { container } = render(<NavigationLogo isExpanded={false} onClick={mockOnClick} />)
      const logo = container.querySelector('a')
      fireEvent.click(logo!)
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('calls onClick multiple times on multiple clicks', () => {
      const { container } = render(<NavigationLogo isExpanded={false} onClick={mockOnClick} />)
      const logo = container.querySelector('a')
      fireEvent.click(logo!)
      fireEvent.click(logo!)
      fireEvent.click(logo!)
      expect(mockOnClick).toHaveBeenCalledTimes(3)
    })

    it('calls onClick when expanded', () => {
      const { container } = render(<NavigationLogo isExpanded={true} onClick={mockOnClick} />)
      const logo = container.querySelector('a')
      fireEvent.click(logo!)
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('tooltip updates', () => {
    it('updates tooltip attributes based on expansion state', () => {
      const { rerender, container } = render(
        <NavigationLogo isExpanded={true} onClick={mockOnClick} />
      )
      let logo = container.querySelector('a')
      expect(logo).not.toHaveAttribute('data-tooltip-id')

      rerender(<NavigationLogo isExpanded={false} onClick={mockOnClick} />)
      logo = container.querySelector('a')
      expect(logo).toHaveAttribute('data-tooltip-id', 'react-tooltip')
    })
  })

  describe('theme changes', () => {
    it('switches logo when theme changes from dark to light', () => {
      mockUseTheme.isDark = true
      const { rerender } = render(<NavigationLogo isExpanded={false} onClick={mockOnClick} />)
      expect(screen.getByTestId('logo-dark')).toBeInTheDocument()

      mockUseTheme.isDark = false
      rerender(<NavigationLogo isExpanded={false} onClick={mockOnClick} />)
      expect(screen.getByTestId('logo-light')).toBeInTheDocument()
      expect(screen.queryByTestId('logo-dark')).not.toBeInTheDocument()
    })

    it('switches logo when theme changes from light to dark', () => {
      mockUseTheme.isDark = false
      const { rerender } = render(<NavigationLogo isExpanded={false} onClick={mockOnClick} />)
      expect(screen.getByTestId('logo-light')).toBeInTheDocument()

      mockUseTheme.isDark = true
      rerender(<NavigationLogo isExpanded={false} onClick={mockOnClick} />)
      expect(screen.getByTestId('logo-dark')).toBeInTheDocument()
      expect(screen.queryByTestId('logo-light')).not.toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles onClick being called with no arguments', () => {
      const customOnClick = vi.fn()
      const { container } = render(<NavigationLogo isExpanded={false} onClick={customOnClick} />)
      const logo = container.querySelector('a')
      fireEvent.click(logo!)
      expect(customOnClick).toHaveBeenCalled()
    })

    it('renders correctly with both isExpanded and dark theme', () => {
      mockUseTheme.isDark = true
      const { container } = render(<NavigationLogo isExpanded={true} onClick={mockOnClick} />)
      expect(screen.getByTestId('logo-dark')).toBeInTheDocument()
      const logoContainer = container.querySelector('div')
      expect(logoContainer).toHaveClass('w-[156px]')
    })

    it('renders correctly with both isExpanded and light theme', () => {
      mockUseTheme.isDark = false
      const { container } = render(<NavigationLogo isExpanded={true} onClick={mockOnClick} />)
      expect(screen.getByTestId('logo-light')).toBeInTheDocument()
      const logoContainer = container.querySelector('div')
      expect(logoContainer).toHaveClass('w-[156px]')
    })
  })
})
