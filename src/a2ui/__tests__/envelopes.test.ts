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

import { SUPPORTED_COMPONENTS , A2UI_PROTOCOL_VERSION, CATALOG_ID } from '@/a2ui/config'
import {
  envelopesContainSurface,
  findCreatedSurfaceIds,
  findUnsupportedComponentType,
} from '@/a2ui/envelopes'
import type { A2uiEnvelope } from '@/a2ui/types'

const surfaceEnvelopes = (surfaceId = 's1'): A2uiEnvelope[] => [
  { version: A2UI_PROTOCOL_VERSION, createSurface: { surfaceId, catalogId: CATALOG_ID } },
  {
    version: A2UI_PROTOCOL_VERSION,
    updateComponents: {
      surfaceId,
      components: [
        { id: 'root', component: 'Column', children: ['greeting'] },
        { id: 'greeting', component: 'Text', text: 'Hello' },
      ],
    },
  },
]

describe('findUnsupportedComponentType', () => {
  it('returns null when every component is in the supported registry', () => {
    expect(findUnsupportedComponentType(surfaceEnvelopes(), SUPPORTED_COMPONENTS)).toBeNull()
  })

  it('returns the first component type outside the registry', () => {
    const envelopes: A2uiEnvelope[] = [
      {
        version: A2UI_PROTOCOL_VERSION,
        updateComponents: {
          surfaceId: 's1',
          components: [
            { id: 'root', component: 'Column', children: ['w'] },
            { id: 'w', component: 'FancyWidget' },
          ],
        },
      },
    ]
    expect(findUnsupportedComponentType(envelopes, SUPPORTED_COMPONENTS)).toBe('FancyWidget')
  })

  it('tolerates malformed envelopes without throwing', () => {
    const envelopes = [
      null,
      { version: A2UI_PROTOCOL_VERSION },
      { version: A2UI_PROTOCOL_VERSION, updateComponents: { surfaceId: 's1', components: 'nope' } },
      { version: A2UI_PROTOCOL_VERSION, updateComponents: { surfaceId: 's1', components: [null, 42] } },
    ] as unknown as A2uiEnvelope[]
    expect(findUnsupportedComponentType(envelopes, SUPPORTED_COMPONENTS)).toBeNull()
  })
})

describe('envelopesContainSurface', () => {
  it('finds the surface id inside any envelope payload', () => {
    expect(envelopesContainSurface(surfaceEnvelopes('surface-42'), 'surface-42')).toBe(true)
  })

  it('returns false for an unknown surface id or malformed envelopes', () => {
    expect(envelopesContainSurface(surfaceEnvelopes('s1'), 'other')).toBe(false)
    expect(envelopesContainSurface([], 's1')).toBe(false)
    expect(envelopesContainSurface([null] as unknown as A2uiEnvelope[], 's1')).toBe(false)
  })
})

describe('findCreatedSurfaceIds', () => {
  it('returns the id of the created surface', () => {
    expect(findCreatedSurfaceIds(surfaceEnvelopes('surface-7'))).toEqual(['surface-7'])
  })

  it('returns every created surface, in envelope order, without duplicates', () => {
    const envelopes = [
      ...surfaceEnvelopes('s1'),
      ...surfaceEnvelopes('s2'),
      ...surfaceEnvelopes('s1'),
    ]
    expect(findCreatedSurfaceIds(envelopes)).toEqual(['s1', 's2'])
  })

  it('returns an empty list when the envelopes create no surface', () => {
    expect(findCreatedSurfaceIds([{ version: A2UI_PROTOCOL_VERSION }])).toEqual([])
  })
})

describe('the wire vocabulary lives in one module', () => {
  it('no other file spells out a message kind', async () => {
    // Mirrors the backend's guard. The protocol renames these in v1.0, and the value of
    // naming them once is only real if nothing quietly reintroduces a literal.
    const { readdirSync, readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const dir = join(process.cwd(), 'src/a2ui')
    const offenders: string[] = []
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.ts') && !name.endsWith('.tsx')) continue
      if (name === 'config.ts') continue // the vocabulary itself
      const text = readFileSync(join(dir, name), 'utf8')
      for (const kind of ['createSurface', 'updateComponents', 'updateDataModel']) {
        // Accesses and object keys, not prose in a comment.
        for (const shape of [`.${kind}`, `${kind}:`, `'${kind}'`, `"${kind}"`]) {
          if (text.includes(shape)) offenders.push(`${name}: ${shape}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
