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

// The SDK's ChoicePicker and Slider accept `validationErrors` and render nothing, so a
// required field blocked submission with no way to learn which one was at fault. This
// drives the real MessageProcessor so it fails if the wiring — not just the wrapper —
// stops producing the message.
describe('a field that blocks submission says why', () => {
  it('shows the message when a required ChoicePicker is empty', () => {
    const processor = new MessageProcessor<ReactComponentImplementation>([createA2uiCatalog()])
    let surface: SurfaceModel<ReactComponentImplementation> | undefined
    processor.onSurfaceCreated((c) => { surface = c })
    processor.processMessages([
      { version: A2UI_PROTOCOL_VERSION, createSurface: { surfaceId: 's1', catalogId: CATALOG_ID } },
      {
        version: A2UI_PROTOCOL_VERSION,
        updateComponents: {
          surfaceId: 's1',
          components: [
            { id: 'root', component: 'Column', children: ['department'] },
            {
              id: 'department',
              component: 'ChoicePicker',
              label: 'Department*',
              displayStyle: 'chips',
              variant: 'mutuallyExclusive',
              value: { path: '/department' },
              options: [{ label: 'HR', value: 'HR' }],
              checks: [
                {
                  message: 'Please select your department',
                  condition: { call: 'required', args: { value: { path: '/department' } } },
                },
              ],
            },
          ],
        },
      },
      { version: A2UI_PROTOCOL_VERSION, updateDataModel: { surfaceId: 's1', path: '/', value: { department: [] } } },
    ] as never)
    render(<A2uiSurface surface={surface!} />)
    expect(screen.getByText('Please select your department')).toBeInTheDocument()
  })

  it('takes the message away the moment the field is filled in', async () => {
    // The wrapper renders once; only the SDK component inside it re-renders on its own
    // subscription. Without subscribing to the check's condition the message stayed on
    // screen after the user had already picked an option.
    const user = userEvent.setup()
    const processor = new MessageProcessor<ReactComponentImplementation>([createA2uiCatalog()])
    let surface: SurfaceModel<ReactComponentImplementation> | undefined
    processor.onSurfaceCreated((c) => {
      surface = c
    })
    processor.processMessages([
      { version: A2UI_PROTOCOL_VERSION, createSurface: { surfaceId: 's2', catalogId: CATALOG_ID } },
      {
        version: A2UI_PROTOCOL_VERSION,
        updateComponents: {
          surfaceId: 's2',
          components: [
            { id: 'root', component: 'Column', children: ['department'] },
            {
              id: 'department',
              component: 'ChoicePicker',
              label: 'Department*',
              displayStyle: 'chips',
              variant: 'mutuallyExclusive',
              value: { path: '/department' },
              options: [{ label: 'HR', value: 'HR' }],
              checks: [
                {
                  message: 'Please select your department',
                  condition: { call: 'required', args: { value: { path: '/department' } } },
                },
              ],
            },
          ],
        },
      },
      {
        version: A2UI_PROTOCOL_VERSION,
        updateDataModel: { surfaceId: 's2', path: '/', value: { department: [] } },
      },
    ] as never)
    render(<A2uiSurface surface={surface!} />)
    expect(screen.getByText('Please select your department')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'HR' }))

    expect(screen.queryByText('Please select your department')).not.toBeInTheDocument()
  })
})
