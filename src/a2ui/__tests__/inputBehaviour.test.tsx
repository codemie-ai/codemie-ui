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
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import {
  A2UI_PROTOCOL_VERSION,
  A2uiSurface,
  CATALOG_ID,
  MessageProcessor,
  type ReactComponentImplementation,
  type SurfaceModel,
} from '@/a2ui/config'
import { normalizeToCatalog } from '@/a2ui/envelopes'
import { createA2uiCatalog } from '@/a2ui/registry'
import type { A2uiEnvelope } from '@/a2ui/types'

/**
 * What an input must put in the data model, tested through the real catalog rather than
 * through a renderer function.
 *
 * The renderers are the SDK's now, so asserting their internals would test somebody
 * else's code. What still matters to us is the shape that leaves the browser: the server
 * re-validates every answer against the surface it stored, and a value of the wrong type
 * is refused with a message describing state the user cannot see. These are the rules it
 * enforces, checked from the outside.
 */

const build = (components: unknown[], dataModel?: Record<string, unknown>) => {
  const processor = new MessageProcessor<ReactComponentImplementation>([createA2uiCatalog()])
  let surface: SurfaceModel<ReactComponentImplementation> | undefined
  processor.onSurfaceCreated((created) => {
    surface = created
  })
  const envelopes = [
    { version: A2UI_PROTOCOL_VERSION, createSurface: { surfaceId: 's1', catalogId: CATALOG_ID } },
    { version: A2UI_PROTOCOL_VERSION, updateComponents: { surfaceId: 's1', components } },
    ...(dataModel
      ? [{ version: A2UI_PROTOCOL_VERSION, updateDataModel: { surfaceId: 's1', path: '/', value: dataModel } }]
      : []),
  ] as unknown as A2uiEnvelope[]
  processor.processMessages(normalizeToCatalog(envelopes) as never)
  return surface!
}

const model = (surface: SurfaceModel<ReactComponentImplementation>) =>
  surface.dataModel.get('/') as Record<string, unknown>

describe('a number field', () => {
  it('submits the typed digits as a string — a known cost of the catalog renderer', async () => {
    const surface = build(
      [
        { id: 'root', component: 'Column', children: ['qty'] },
        { id: 'qty', component: 'TextField', label: 'Quantity', variant: 'number', value: { path: '/qty' } },
      ],
      { qty: '' }
    )
    render(<A2uiSurface surface={surface} />)
    await userEvent.type(screen.getByLabelText('Quantity'), '42')
    // Pinned as-is rather than worked around. The catalog's TextField writes the input's
    // text for every variant, so a "number" field yields "42", not 42. The server accepts
    // both (a numeric variant may carry either), so nothing is refused — but the agent is
    // handed a string where it asked for a number, and this test is here so that cost
    // stays visible instead of being discovered downstream.
    expect(model(surface).qty).toBe('42')
  })
})

describe('a choice field submits a list of strings', () => {
  const picker = (variant?: string) => [
    { id: 'root', component: 'Column', children: ['plan'] },
    {
      id: 'plan',
      component: 'ChoicePicker',
      label: 'Plan',
      value: { path: '/plan' },
      options: [
        { label: 'Free', value: 'free' },
        { label: 'Pro', value: 'pro' },
      ],
      ...(variant ? { variant } : {}),
    },
  ]

  it('shows the agent’s scalar seed as the selection it means', () => {
    // A re-rendered form arrives carrying the agent's own seed values, and those come
    // back as scalars. Read literally, the control shows nothing selected while the model
    // still holds a string, and the untouched field is refused.
    const surface = build(picker(), { plan: 'pro' })
    expect(model(surface).plan).toEqual(['pro'])
  })

  it('keeps a single-choice picker to one selection without an explicit variant', async () => {
    // The catalog defaults `variant` to mutuallyExclusive; the server enforces the cap.
    const surface = build(picker(), { plan: [] })
    render(<A2uiSurface surface={surface} />)
    await userEvent.click(screen.getByText('Free'))
    await userEvent.click(screen.getByText('Pro'))
    expect(model(surface).plan).toEqual(['pro'])
  })

  it('lets a multi-select picker hold several', async () => {
    const surface = build(picker('multipleSelection'), { plan: [] })
    render(<A2uiSurface surface={surface} />)
    await userEvent.click(screen.getByText('Free'))
    await userEvent.click(screen.getByText('Pro'))
    expect(model(surface).plan).toEqual(['free', 'pro'])
  })
})

describe('a checkbox submits a boolean', () => {
  it('writes true once ticked', async () => {
    const surface = build(
      [
        { id: 'root', component: 'Column', children: ['agree'] },
        { id: 'agree', component: 'CheckBox', label: 'I agree', value: { path: '/agree' } },
      ],
      { agree: false }
    )
    render(<A2uiSurface surface={surface} />)
    await userEvent.click(screen.getByLabelText('I agree'))
    expect(model(surface).agree).toBe(true)
  })
})
