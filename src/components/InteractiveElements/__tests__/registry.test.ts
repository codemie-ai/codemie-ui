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

import {
  ELEMENT_REGISTRY,
  catalogElementLabels,
  elementsByFeature,
} from '@/components/InteractiveElements/registry'
import type { InteractiveElement } from '@/types/entity/interactive'

// The wire discriminators the type union declares — kept next to the registry so a new
// element type added to one but not the other is caught here.
const UNION_TYPES: InteractiveElement['type'][] = [
  'text',
  'column',
  'row',
  'button',
  'multiple_choice',
  'dropdown',
  'text_field',
  'checkbox',
  'date_picker',
]

describe('interactive element registry', () => {
  it('has exactly one descriptor per element type in the union', () => {
    const registryTypes = ELEMENT_REGISTRY.map((d) => d.type).sort()
    expect(registryTypes).toEqual([...UNION_TYPES].sort())
  })

  it('derives the catalog labels from the registry (incl. Dropdown and Date picker)', () => {
    const labels = catalogElementLabels()
    expect(labels).toContain('Dropdown')
    expect(labels).toContain('Date picker')
    // Layout elements (no feature) are not part of the user-facing catalog list.
    expect(labels).not.toContain('Column')
  })

  it('groups catalog elements by the feature that enables them', () => {
    const grouped = elementsByFeature()
    expect(grouped.choice).toEqual(expect.arrayContaining(['Multiple choice', 'Dropdown']))
    expect(grouped.short_forms).toEqual(expect.arrayContaining(['Date picker']))
  })
})
