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

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Tooltip } from 'react-tooltip'
import { afterEach, expect, it, vi } from 'vitest'

import NavigationMore from '../NavigationMore'

afterEach(cleanup)

it('hides the hovered trigger tooltip while its actionable menu is open', async () => {
  const select = vi.fn()
  render(
    <>
      <NavigationMore
        data-tooltip-content="Version 1 actions"
        items={[{ title: 'Use for preview', onClick: select }]}
        hideOnClickInside
      />
      <Tooltip id="react-tooltip" clickable delayShow={0} delayHide={0} />
    </>
  )
  const trigger = screen.getByRole('button', { name: 'Version 1 actions' })
  fireEvent.mouseOver(trigger)
  await screen.findByRole('tooltip')

  fireEvent.click(trigger)
  await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
  fireEvent.click(screen.getByRole('menuitem', { name: 'Use for preview' }))
  expect(select).toHaveBeenCalledOnce()
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})
