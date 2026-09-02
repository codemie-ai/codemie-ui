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
import { createA2uiCatalog } from '@/a2ui/registry'
import { isSurfaceValid } from '@/a2ui/useA2uiSurface'

/**
 * The backend advertises the Basic Catalog to the model verbatim, under the catalog's
 * published id — so every property it describes has to actually do something here. A
 * property that is emitted and then silently ignored is drift between the two halves,
 * which is what these tests pin down for the four that used to be ignored:
 * `accessibility`, `weight`, `displayStyle` and `validationRegexp`.
 */

const buildSurface = (components: unknown[], dataModel?: Record<string, unknown>) => {
  const processor = new MessageProcessor<ReactComponentImplementation>([createA2uiCatalog()])
  let surface: SurfaceModel<ReactComponentImplementation> | undefined
  processor.onSurfaceCreated((created) => {
    surface = created
  })
  processor.processMessages([
    { version: A2UI_PROTOCOL_VERSION, createSurface: { surfaceId: 's1', catalogId: CATALOG_ID } },
    {
      version: A2UI_PROTOCOL_VERSION,
      updateComponents: { surfaceId: 's1', components: components as never },
    },
    ...(dataModel
      ? [
          {
            version: A2UI_PROTOCOL_VERSION,
            updateDataModel: { surfaceId: 's1', path: '/', value: dataModel },
          },
        ]
      : []),
  ] as never)
  return surface!
}

const submitButton = () => [
  { id: 'ok', component: 'Button', child: 'ok-label', action: { event: { name: 'ok' } } },
  { id: 'ok-label', component: 'Text', text: 'Send' },
]

describe('accessibility', () => {
  it('labels an input control itself, where a screen reader conveys it best', () => {
    const surface = buildSurface([
      { id: 'root', component: 'Column', children: ['field'] },
      {
        id: 'field',
        component: 'TextField',
        label: 'Name',
        value: { path: '/name' },
        accessibility: { label: 'Your full name' },
      },
    ])
    render(<A2uiSurface surface={surface} />)
    expect(screen.getByLabelText('Your full name')).toBeInTheDocument()
  })

  it('labels a non-interactive component through a wrapper that carries a role', () => {
    // `aria-label` on a bare div is ignored by assistive technology, so the wrapper is a
    // `fieldset` — grouping semantics every device honours — rather than a div wearing an
    // ARIA role. Queried by role, which is what a screen reader actually resolves.
    const surface = buildSurface([
      { id: 'root', component: 'Column', children: ['note'] },
      { id: 'note', component: 'Text', text: 'Terms', accessibility: { label: 'Legal notice' } },
    ])
    render(<A2uiSurface surface={surface} />)
    expect(screen.getByRole('group', { name: 'Legal notice' })).toBeInTheDocument()
  })

  it('adds no wrapper when the component declares no accessibility', () => {
    const surface = buildSurface([
      { id: 'root', component: 'Column', children: ['note'] },
      { id: 'note', component: 'Text', text: 'Plain' },
    ])
    const { container } = render(<A2uiSurface surface={surface} />)
    expect(container.querySelector('[role="group"]')).toBeNull()
  })
})

describe('weight', () => {
  it('becomes flex-grow, which is what the catalog says it is', () => {
    const surface = buildSurface([
      { id: 'root', component: 'Row', children: ['wide'] },
      { id: 'wide', component: 'Text', text: 'Wide', weight: 3 },
    ])
    const { container } = render(<A2uiSurface surface={surface} />)
    const grown = Array.from(container.querySelectorAll<HTMLElement>('div')).find(
      (node) => node.style.flexGrow === '3'
    )
    expect(grown).toBeDefined()
  })

  it('leaves markup untouched when no weight is declared', () => {
    const surface = buildSurface([
      { id: 'root', component: 'Row', children: ['plain'] },
      { id: 'plain', component: 'Text', text: 'Plain' },
    ])
    const { container } = render(<A2uiSurface surface={surface} />)
    const grown = Array.from(container.querySelectorAll<HTMLElement>('div')).filter(
      (node) => node.style.flexGrow
    )
    expect(grown).toHaveLength(0)
  })
})

describe('displayStyle', () => {
  const picker = (displayStyle?: string) => [
    { id: 'root', component: 'Column', children: ['pick'] },
    {
      id: 'pick',
      component: 'ChoicePicker',
      label: 'Plan',
      value: { path: '/plan' },
      options: [
        { label: 'Free', value: 'free' },
        { label: 'Pro', value: 'pro' },
      ],
      ...(displayStyle ? { displayStyle } : {}),
    },
  ]

  it('is honoured by the catalog renderer, and selection still works through it', async () => {
    // Presentation itself is not assertable here: the catalog styles its components with
    // CSS modules, and Vitest does not process CSS, so every module class name comes back
    // empty in jsdom. What this pins is that declaring `chips` neither breaks rendering
    // nor changes the contract — the appearance is checked in the browser.
    const surface = buildSurface(picker('chips'), { plan: [] })
    render(<A2uiSurface surface={surface} />)
    await userEvent.click(screen.getByText('Pro'))
    expect(surface.dataModel.get('/')).toEqual({ plan: ['pro'] })
  })

  it('renders without a displayStyle just the same', async () => {
    const surface = buildSurface(picker(), { plan: [] })
    render(<A2uiSurface surface={surface} />)
    await userEvent.click(screen.getByText('Free'))
    expect(surface.dataModel.get('/')).toEqual({ plan: ['free'] })
  })
})

describe('validationRegexp', () => {
  const patterned = (seed: string) => ({
    components: [
      { id: 'root', component: 'Column', children: ['code', ...submitButton().map((c) => c.id)] },
      {
        id: 'code',
        component: 'TextField',
        label: 'Code',
        value: { path: '/code' },
        validationRegexp: '^[A-Z]{3}$',
      },
      ...submitButton(),
    ],
    dataModel: { code: seed },
  })

  it('blocks submission while the value does not match', () => {
    const { components, dataModel } = patterned('ab')
    expect(isSurfaceValid(buildSurface(components, dataModel))).toBe(false)
  })

  it('allows submission once the value matches', () => {
    const { components, dataModel } = patterned('ABC')
    expect(isSurfaceValid(buildSurface(components, dataModel))).toBe(true)
  })

  it('treats an empty field as unfilled, not as wrongly formatted', () => {
    // Otherwise an optional field opens in an error state the user cannot clear.
    const { components, dataModel } = patterned('')
    expect(isSurfaceValid(buildSurface(components, dataModel))).toBe(true)
  })

  it('ignores a pattern that does not compile instead of locking the form', () => {
    const surface = buildSurface(
      [
        { id: 'root', component: 'Column', children: ['code'] },
        {
          id: 'code',
          component: 'TextField',
          label: 'Code',
          value: { path: '/code' },
          validationRegexp: '([unclosed',
        },
      ],
      { code: 'whatever' }
    )
    expect(isSurfaceValid(surface)).toBe(true)
  })

  it('carries no inline message — a known cost of the catalog renderer', () => {
    // The catalog's TextField does not read `validationRegexp` at all, so nothing paints a
    // field-level error. Submission is still blocked (above), and the chat block explains
    // the refusal with its own notice. Pinned so the gap is a recorded decision rather
    // than something rediscovered as a bug.
    const { components, dataModel } = patterned('ab')
    render(<A2uiSurface surface={buildSurface(components, dataModel)} />)
    expect(screen.queryByText(/match the requested format/i)).toBeNull()
  })
})
