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

import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { floatingKataStore } from '@/store/floatingKata'

import FloatingKataWindow from '../FloatingKataWindow'

vi.mock('@/pages/katas/components/StepByStepNavigator', () => ({
  default: () => <div>kata steps</div>,
}))

vi.mock('@/pages/katas/components/CompleteKataConfirmation', () => ({
  default: () => null,
}))

const { innerWidth, innerHeight } = window

const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
}

const renderWindow = () =>
  render(
    <MemoryRouter>
      <FloatingKataWindow />
    </MemoryRouter>
  )

const kataWindow = () => screen.getByText('Build a skill').closest('.fixed') as HTMLElement
const kataContent = () => screen.getByText('kata steps').parentElement as HTMLElement

describe('FloatingKataWindow', () => {
  beforeEach(() => {
    Object.assign(floatingKataStore, {
      kataId: 'kata-1',
      kataTitle: 'Build a skill',
      markdownContent: '# Step 1',
      currentStepIndex: 0,
      isVisible: true,
      isCollapsed: false,
      position: { x: 20, y: 20 },
    })
  })

  afterEach(() => {
    cleanup()
    setViewport(innerWidth, innerHeight)
    floatingKataStore.isVisible = false
  })

  it('keeps its fixed size on desktop screens', () => {
    setViewport(1440, 900)
    renderWindow()

    expect(kataWindow()).toHaveStyle({ width: '500px', maxHeight: '650px' })
    expect(kataContent()).toHaveStyle({ maxHeight: '590px' })
  })

  it('fits a short phone screen', () => {
    setViewport(375, 560)
    renderWindow()

    expect(kataWindow()).toHaveStyle({ width: '359px', maxHeight: '544px' })
    expect(kataContent()).toHaveStyle({ maxHeight: '484px' })
  })

  it('follows the screen when it rotates', () => {
    setViewport(1440, 900)
    renderWindow()

    act(() => {
      setViewport(375, 812)
      window.dispatchEvent(new Event('resize'))
    })

    expect(kataWindow()).toHaveStyle({ width: '359px' })
  })

  it('pulls a position saved on a larger screen back into view', () => {
    floatingKataStore.position = { x: 2000, y: 3000 }
    setViewport(375, 812)
    renderWindow()

    expect(kataWindow().style.transform).toBe('translate(16px,162px)')
  })
})
