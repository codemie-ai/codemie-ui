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

import { render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { A2UI_PROTOCOL_VERSION, A2uiSurface, CATALOG_ID } from '@/a2ui/config'
import type { A2uiEnvelope } from '@/a2ui/types'
import { useA2uiSurface } from '@/a2ui/useA2uiSurface'

const surfaceEnvelopes = (surfaceId = 's1'): A2uiEnvelope[] => [
  { version: A2UI_PROTOCOL_VERSION, createSurface: { surfaceId, catalogId: CATALOG_ID } },
  {
    version: A2UI_PROTOCOL_VERSION,
    updateComponents: {
      surfaceId,
      components: [
        { id: 'root', component: 'Column', children: ['greeting'] },
        { id: 'greeting', component: 'Text', text: 'Hello from A2UI' },
      ],
    },
  },
  {
    version: A2UI_PROTOCOL_VERSION,
    updateDataModel: { surfaceId, path: '/', value: { name: 'Ada' } },
  },
]

describe('useA2uiSurface', () => {
  it('replays envelopes into a renderable surface', () => {
    const { result } = renderHook(() => useA2uiSurface(surfaceEnvelopes()))

    expect(result.current.error).toBe(false)
    expect(result.current.unsupportedComponent).toBeNull()
    expect(result.current.surfaces).toHaveLength(1)

    render(<A2uiSurface surface={result.current.surfaces[0]} />)
    expect(screen.getByText('Hello from A2UI')).toBeInTheDocument()
  })

  it('is idempotent: same envelope array is not reprocessed, a new one replays cleanly', () => {
    const envelopes = surfaceEnvelopes()
    const { result, rerender } = renderHook(({ input }) => useA2uiSurface(input), {
      initialProps: { input: envelopes },
    })
    const firstSurfaces = result.current.surfaces

    rerender({ input: envelopes })
    expect(result.current.surfaces).toBe(firstSurfaces)

    // A grown envelope list (streaming) is a NEW array — full clean replay, no
    // "surface already exists" errors, latest data model applied.
    const grown = [
      ...envelopes,
      {
        version: A2UI_PROTOCOL_VERSION,
        updateDataModel: { surfaceId: 's1', path: '/name', value: 'Bob' },
      },
    ]
    rerender({ input: grown })
    expect(result.current.error).toBe(false)
    expect(result.current.surfaces).toHaveLength(1)
    expect(result.current.surfaces[0].dataModel.get('/name')).toBe('Bob')
  })

  it('accepts frozen (store snapshot) envelopes and keeps the data model writable', () => {
    const frozen = surfaceEnvelopes().map((envelope) => Object.freeze(envelope))
    Object.values(frozen).forEach((envelope) =>
      Object.values(envelope).forEach((payload) => {
        if (payload && typeof payload === 'object') Object.freeze(payload)
      })
    )

    const { result } = renderHook(() => useA2uiSurface(frozen))
    expect(result.current.surfaces).toHaveLength(1)
    expect(() => result.current.surfaces[0].dataModel.set('/name', 'Bob')).not.toThrow()
    expect(result.current.surfaces[0].dataModel.get('/name')).toBe('Bob')
  })

  it('pre-filters unsupported component types instead of processing them', () => {
    const envelopes: A2uiEnvelope[] = [
      { version: A2UI_PROTOCOL_VERSION, createSurface: { surfaceId: 's1', catalogId: CATALOG_ID } },
      {
        version: A2UI_PROTOCOL_VERSION,
        updateComponents: {
          surfaceId: 's1',
          components: [{ id: 'root', component: 'FancyWidget' }],
        },
      },
    ]
    const { result } = renderHook(() => useA2uiSurface(envelopes))
    expect(result.current.unsupportedComponent).toBe('FancyWidget')
    expect(result.current.surfaces).toHaveLength(0)
    expect(result.current.error).toBe(false)
  })

  it('reports an error for envelopes the processor rejects', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const envelopes: A2uiEnvelope[] = [
      {
        version: A2UI_PROTOCOL_VERSION,
        createSurface: { surfaceId: 's1', catalogId: 'https://bogus.example/catalog.json' },
      },
    ]
    const { result } = renderHook(() => useA2uiSurface(envelopes))
    expect(result.current.error).toBe(true)
    expect(result.current.surfaces).toHaveLength(0)
  })

  it('flags a created surface whose root component never arrived', () => {
    const envelopes: A2uiEnvelope[] = [
      { version: A2UI_PROTOCOL_VERSION, createSurface: { surfaceId: 's1', catalogId: CATALOG_ID } },
    ]
    const { result } = renderHook(() => useA2uiSurface(envelopes))
    expect(result.current.missingRoot).toBe(true)
    expect(result.current.error).toBe(false)
  })

  it('does not flag a surface that has a root component', () => {
    const { result } = renderHook(() => useA2uiSurface(surfaceEnvelopes()))
    expect(result.current.missingRoot).toBe(false)
  })

  it('applies a prefill data model per surface id', () => {
    const envelopes = [...surfaceEnvelopes('s1'), ...surfaceEnvelopes('s2')]
    const { result } = renderHook(() =>
      useA2uiSurface(envelopes, undefined, { s2: { name: 'Bob', tags: ['x'] } })
    )
    expect(result.current.surfaces).toHaveLength(2)
    expect(result.current.surfaces[0].dataModel.get('/name')).toBe('Ada')
    expect(result.current.surfaces[1].dataModel.get('/name')).toBe('Bob')
    expect(result.current.surfaces[1].dataModel.get('/tags')).toEqual(['x'])
  })

  it('returns an empty result for missing envelopes', () => {
    const { result } = renderHook(() => useA2uiSurface(null))
    expect(result.current.surfaces).toHaveLength(0)
    expect(result.current.error).toBe(false)
    expect(result.current.unsupportedComponent).toBeNull()
  })

  it('invokes the action handler with the surface data model', async () => {
    const onAction = vi.fn()
    const { result } = renderHook(() => useA2uiSurface(surfaceEnvelopes(), onAction))

    result.current.surfaces[0].dataModel.set('/name', 'Bob')
    await result.current.surfaces[0].dispatchAction({ event: { name: 'submit', context: {} } }, 'btn')

    expect(onAction).toHaveBeenCalledTimes(1)
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'submit',
        surfaceId: 's1',
        sourceComponentId: 'btn',
        dataModel: { name: 'Bob' },
      })
    )
  })
})
