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

// End-to-end smoke: real MessageProcessor + our catalog + A2uiSurface.
// Detailed per-component behavior is covered by the isolated renderer tests.
describe('a2ui surface smoke', () => {
  it('processes createSurface + updateComponents and renders a Text component', () => {
    const processor = new MessageProcessor<ReactComponentImplementation>([createA2uiCatalog()])
    let surface: SurfaceModel<ReactComponentImplementation> | undefined
    processor.onSurfaceCreated((created) => {
      surface = created
    })

    expect(() =>
      processor.processMessages([
        {
          version: A2UI_PROTOCOL_VERSION,
          createSurface: { surfaceId: 's1', catalogId: CATALOG_ID },
        },
        {
          version: A2UI_PROTOCOL_VERSION,
          updateComponents: {
            surfaceId: 's1',
            components: [
              { id: 'root', component: 'Column', children: ['greeting'] },
              { id: 'greeting', component: 'Text', text: 'Hello from A2UI' },
            ],
          },
        },
      ])
    ).not.toThrow()

    expect(surface).toBeDefined()
    render(<A2uiSurface surface={surface!} />)
    expect(screen.getByText('Hello from A2UI')).toBeInTheDocument()
  })
})
