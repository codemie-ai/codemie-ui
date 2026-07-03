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

import { applyOverrides, clearOverrides, CUSTOM_COLOR_VARIABLES } from '../apply'
import { runRules } from '../engine'
import { PRESETS } from '../presets'

import type { CssVarOverrides } from '../schema'

describe('apply', () => {
  describe('CUSTOM_COLOR_VARIABLES', () => {
    it('is a non-empty list of CSS custom properties', () => {
      expect(CUSTOM_COLOR_VARIABLES.length).toBeGreaterThan(0)
      CUSTOM_COLOR_VARIABLES.forEach((v) => expect(v.startsWith('--')).toBe(true))
    })

    it('contains no duplicates', () => {
      expect(new Set(CUSTOM_COLOR_VARIABLES).size).toBe(CUSTOM_COLOR_VARIABLES.length)
    })
  })

  describe('clearOverrides', () => {
    it('removes every managed variable from the element', () => {
      const el = document.createElement('div')
      CUSTOM_COLOR_VARIABLES.forEach((v) => el.style.setProperty(v, '1 2 3'))

      clearOverrides(el)

      CUSTOM_COLOR_VARIABLES.forEach((v) => expect(el.style.getPropertyValue(v)).toBe(''))
    })

    it('leaves unmanaged properties untouched', () => {
      const el = document.createElement('div')
      el.style.setProperty('--unmanaged', 'keep')

      clearOverrides(el)

      expect(el.style.getPropertyValue('--unmanaged')).toBe('keep')
    })
  })

  describe('applyOverrides', () => {
    it('sets each variable/value pair on the element', () => {
      const el = document.createElement('div')
      const overrides: CssVarOverrides = {
        '--colors-text-accent': '10 20 30',
        '--font-family-body': 'serif',
      }

      applyOverrides(el, overrides)

      expect(el.style.getPropertyValue('--colors-text-accent')).toBe('10 20 30')
      expect(el.style.getPropertyValue('--font-family-body')).toBe('serif')
    })

    it('clears stale managed variables not present in the new overrides', () => {
      const el = document.createElement('div')
      el.style.setProperty('--colors-text-primary', '99 99 99')

      applyOverrides(el, { '--colors-text-accent': '1 2 3' })

      expect(el.style.getPropertyValue('--colors-text-primary')).toBe('')
      expect(el.style.getPropertyValue('--colors-text-accent')).toBe('1 2 3')
    })
  })

  describe('invariant: produced variables are clearable', () => {
    it('every variable produced by runRules for every preset is in CUSTOM_COLOR_VARIABLES', () => {
      const managed = new Set<string>(CUSTOM_COLOR_VARIABLES)

      PRESETS.forEach((preset) => {
        Object.keys(runRules(preset.values)).forEach((cssVar) => {
          expect(managed.has(cssVar)).toBe(true)
        })
      })
    })
  })
})
