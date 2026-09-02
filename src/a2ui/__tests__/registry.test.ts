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

import { describe, expect, it } from 'vitest'

import { SUPPORTED_COMPONENTS , CATALOG_ID } from '@/a2ui/config'
import { A2UI_COMPONENTS, createA2uiCatalog } from '@/a2ui/registry'

// The 18 components of the A2UI v0.9 Basic Catalog — the contract with the backend.
const BASIC_CATALOG_COMPONENTS = [
  'AudioPlayer',
  'Button',
  'Card',
  'CheckBox',
  'ChoicePicker',
  'Column',
  'DateTimeInput',
  'Divider',
  'Icon',
  'Image',
  'List',
  'Modal',
  'Row',
  'Slider',
  'Tabs',
  'Text',
  'TextField',
  'Video',
]

describe('a2ui registry', () => {
  it('registers exactly the 18 Basic Catalog components', () => {
    expect([...SUPPORTED_COMPONENTS].sort()).toEqual(BASIC_CATALOG_COMPONENTS)
    expect(SUPPORTED_COMPONENTS).toHaveLength(18)
  })

  it('derives SUPPORTED_COMPONENTS from the component registry', () => {
    expect([...SUPPORTED_COMPONENTS].sort()).toEqual(Object.keys(A2UI_COMPONENTS).sort())
  })

  it('every implementation is named after its registry key', () => {
    for (const [name, implementation] of Object.entries(A2UI_COMPONENTS)) {
      expect(implementation.name).toBe(name)
      expect(typeof implementation.render).toBe('function')
      expect(implementation.schema).toBeDefined()
    }
  })

  it('builds a Catalog under the canonical catalog id', () => {
    const catalog = createA2uiCatalog()
    expect(catalog.id).toBe(CATALOG_ID)
    for (const name of BASIC_CATALOG_COMPONENTS) {
      expect(catalog.components.has(name)).toBe(true)
    }
  })

  it('wires the Basic Catalog functions (checks: required/regex/…) into the catalog', () => {
    const catalog = createA2uiCatalog()
    expect(catalog.functions.size).toBeGreaterThan(0)
    expect(catalog.functions.has('required')).toBe(true)
    expect(catalog.functions.has('regex')).toBe(true)
  })
})
