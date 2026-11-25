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

import { readFileSync } from 'fs'
import { resolve } from 'path'

import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'

import Button from '../Button'

afterEach(cleanup)

const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

const luminance = (rgb: number[]) => {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Contrast of `text` over a background tinted with `text` at 10% opacity.
const contrastOnTint = (text: string, surface: string) => {
  const fg = toRgb(text)
  const tinted = fg.map((v, i) => v * 0.1 + toRgb(surface)[i] * 0.9)
  const [hi, lo] = [luminance(fg), luminance(tinted)].sort((a, b) => b - a)
  return (hi + 0.05) / (lo + 0.05)
}

describe('Button magical variant prop', () => {
  it('applies magical classes when variant="magical" is used instead of type', () => {
    render(<Button variant="magical">Generate with AI</Button>)
    const button = screen.getByRole('button', { name: 'Generate with AI' })
    expect(button).toHaveClass('bg-magical-button')
    expect(button).toHaveClass('text-text-inverse')
    expect(button).toHaveClass('hover:brightness-90')
  })

  it('variant prop takes precedence over type prop for magical', () => {
    render(
      <Button type="primary" variant="magical">
        Generate with AI
      </Button>
    )
    const button = screen.getByRole('button', { name: 'Generate with AI' })
    expect(button).toHaveClass('bg-magical-button')
    expect(button).not.toHaveClass('bg-button-primary-bg')
  })
})

describe('Button magical variant classes', () => {
  it('renders bg-magical-button class', () => {
    // Arrange
    render(<Button type="magical">Generate with AI</Button>)
    // Act
    const button = screen.getByRole('button', { name: 'Generate with AI' })
    // Assert
    expect(button).toHaveClass('bg-magical-button')
  })

  it('renders text-text-inverse class', () => {
    render(<Button type="magical">Generate with AI</Button>)
    const button = screen.getByRole('button', { name: 'Generate with AI' })
    expect(button).toHaveClass('text-text-inverse')
  })

  it('renders hover:brightness-90 class', () => {
    render(<Button type="magical">Generate with AI</Button>)
    const button = screen.getByRole('button', { name: 'Generate with AI' })
    expect(button).toHaveClass('hover:brightness-90')
  })

  it('does not render hover:brightness-110 class', () => {
    render(<Button type="magical">Generate with AI</Button>)
    const button = screen.getByRole('button', { name: 'Generate with AI' })
    expect(button).not.toHaveClass('hover:brightness-110')
  })

  it('applies disabled styling on a magical button', () => {
    render(
      <Button type="magical" disabled>
        Generate with AI
      </Button>
    )
    const button = screen.getByRole('button', { name: 'Generate with AI' })
    expect(button).toHaveClass('bg-magical-button')
    expect(button).toHaveClass('opacity-50')
    expect(button).toHaveClass('cursor-not-allowed')
    expect(button).toBeDisabled()
  })

  it('applies loading styling on a magical button', () => {
    const { container } = render(
      <Button type="magical" isLoading>
        Generate with AI
      </Button>
    )
    const button = screen.getByRole('button', { name: 'Generate with AI' })
    expect(button).toHaveClass('bg-magical-button')
    expect(button).toHaveClass('cursor-wait')
    expect(button).toBeDisabled()
    // shimmer overlay is present
    expect(container.querySelector('.animate-shimmer')).not.toBeNull()
  })
})

describe('Button delete variant', () => {
  it('renders delete variant with failed-delete hover classes', () => {
    render(<Button type="delete">Delete</Button>)
    const button = screen.getByRole('button', { name: 'Delete' })
    expect(button).toHaveClass(
      'text-failed-delete-default',
      'hover:text-failed-delete-hover',
      'hover:bg-failed-delete-hover/10'
    )
  })

  // WCAG AA (4.5:1) for hover text on the hover-tinted background (text colour at 10% opacity).
  // The theme background is the dark surface the button sits on; light surface is white.
  it('keeps hover text contrast at or above 4.5:1 in both themes', () => {
    const config = readFileSync(resolve(__dirname, '../../../../tailwind.config.ts'), 'utf8')
    const match = /delete: \{[^}]*hover: \[([^\n]+)\]/.exec(config)
    expect(match).not.toBeNull()
    const palette = /red: \{([^}]*)\}/.exec(config)?.[1] ?? ''
    // Resolves either a hex literal ('#RRGGBB') or a palette reference (c['red']['N']) to hex.
    const resolveColor = (ref: string): string => {
      const literal = /^'(#[0-9A-Fa-f]{6})'$/.exec(ref)
      if (literal) return literal[1]
      const index = /^c\['red'\]\['(\d+)'\]$/.exec(ref)?.[1]
      const hex = index && new RegExp(`'${index}': '(#[0-9A-Fa-f]{6})'`).exec(palette)?.[1]
      expect(hex, `unresolvable colour reference: ${ref}`).toBeTruthy()
      return hex as string
    }
    const [darkHover, lightHover] = match![1].split(',').map((ref) => resolveColor(ref.trim()))

    expect(contrastOnTint(darkHover, '#333436')).toBeGreaterThanOrEqual(4.5)
    expect(contrastOnTint(lightHover, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
  })
})
