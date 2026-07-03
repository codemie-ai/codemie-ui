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

import { describe, it, expect } from 'vitest'

import { runRules } from '../engine'
import { DEFAULT_PRESET } from '../presets'

import type { AppearanceInputs } from '../schema'

const inputs = (overrides: Partial<AppearanceInputs> = {}): AppearanceInputs => ({
  ...DEFAULT_PRESET.values,
  ...overrides,
})

describe('rules', () => {
  describe('runRules (engine)', () => {
    it('is deterministic for identical inputs', () => {
      expect(runRules(inputs())).toEqual(runRules(inputs()))
    })

    it('merges outputs across rule groups into a single map', () => {
      const result = runRules(inputs())
      // color (map), font, and gradient groups all contribute
      expect(result['--colors-text-accent']).toBeDefined()
      expect(result['--font-family-body']).toBeDefined()
      expect(result['--backgroundImage-magical-button']).toBeDefined()
    })
  })

  describe('map rules emit RGB channel strings', () => {
    it.each([
      ['#ffffff', '255 255 255'],
      ['#000000', '0 0 0'],
      ['#ff8040', '255 128 64'],
    ])('accentColor %s -> %s', (hex, channels) => {
      expect(runRules(inputs({ accentColor: hex }))['--colors-text-accent']).toBe(channels)
    })
  })

  describe('map.sidebarToggle', () => {
    it('uses the sidebar color channels when matching the background', () => {
      const result = runRules(
        inputs({ sidebarColor: '#ff8040', sidebarToggleMatchesBackground: true })
      )
      expect(result['--colors-surface-specific-sidebar-toggle']).toBe('255 128 64')
    })

    it('derives a neutral gray from the card background otherwise', () => {
      const result = runRules(
        inputs({
          sidebarColor: '#ff8040',
          cardBackground: '#ffffff',
          sidebarToggleMatchesBackground: false,
        })
      )
      const value = result['--colors-surface-specific-sidebar-toggle'] as string
      const channels = value.split(' ')
      // neutral gray => all three channels equal, and not the sidebar color
      expect(channels).toHaveLength(3)
      expect(channels[0]).toBe(channels[1])
      expect(channels[1]).toBe(channels[2])
      expect(value).not.toBe('255 128 64')
    })
  })

  describe('derive.navigationFadeText', () => {
    it('keeps the mapped navigation link color when fading is off', () => {
      const result = runRules(inputs({ navigationTextColor: '#ff8040', navigationFadeText: false }))
      expect(result['--colors-text-specific-navigation-link']).toBe('255 128 64')
    })

    it('overrides the navigation link color with a faded value when on', () => {
      const result = runRules(inputs({ navigationTextColor: '#ff8040', navigationFadeText: true }))
      expect(result['--colors-text-specific-navigation-link']).not.toBe('255 128 64')
    })
  })

  describe('font.fontFamilyBody', () => {
    it('maps a known font stack', () => {
      expect(runRules(inputs({ fontStack: 'serif' }))['--font-family-body']).toContain('Georgia')
    })

    it('falls back to the geist stack for an unknown value', () => {
      const result = runRules(inputs({ fontStack: 'unknown' as AppearanceInputs['fontStack'] }))
      expect(result['--font-family-body']).toContain('GeistMono')
    })
  })

  describe('opacity.bottomNavigationLabelSurface', () => {
    it('returns white channels on a dark navigation background', () => {
      const result = runRules(inputs({ navigationBackground: '#000000' }))
      expect(result['--colors-surface-specific-bottom-navigation-label']).toBe('255 255 255')
    })

    it('returns black channels on a light navigation background', () => {
      const result = runRules(inputs({ navigationBackground: '#ffffff' }))
      expect(result['--colors-surface-specific-bottom-navigation-label']).toBe('0 0 0')
    })
  })

  describe('gradient.block', () => {
    it('emits gradient strings from the raw hex inputs and accent channels for borders', () => {
      const result = runRules(
        inputs({ gradientFrom: '#112233', gradientTo: '#445566', accentColor: '#778899' })
      )
      expect(result['--backgroundImage-magical-button']).toBe(
        'linear-gradient(90deg, #112233 0%, #445566 100%)'
      )
      expect(result['--backgroundImage-gradient-switch-on']).toBe(
        'linear-gradient(to right, #112233, #445566)'
      )
      expect(result['--colors-border-specific-primary-button-from']).toBe('119 136 153')
    })
  })
})
