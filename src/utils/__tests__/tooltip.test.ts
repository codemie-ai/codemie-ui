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

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { setupGlobalTooltip } from '@/utils/tooltip'
import { setupTooltipCloseBehavior } from '@/utils/tooltipCloseBehavior'

const mockRender = vi.fn()

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({ render: mockRender })),
}))

vi.mock('react-tooltip', () => ({
  Tooltip: vi.fn(() => null),
}))

vi.mock('@/utils/tooltipCloseBehavior', () => ({
  setupTooltipCloseBehavior: vi.fn(() => vi.fn()),
}))

const renderedTooltipProps = () => {
  setupGlobalTooltip()
  return mockRender.mock.calls[0][0].props
}

describe('setupGlobalTooltip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('renders the tooltip singleton with clickable: true so it stays visible when hovered', () => {
    expect(renderedTooltipProps().clickable).toBe(true)
  })

  it('renders the tooltip singleton with globalCloseEvents.escape so Esc dismisses it', () => {
    expect(renderedTooltipProps().globalCloseEvents.escape).toBe(true)
  })

  it('closes the tooltip on resize', () => {
    expect(renderedTooltipProps().globalCloseEvents.resize).toBe(true)
  })

  // The library's own scroll close fires on any scroll of the anchor's scroll
  // parent, which the chat history performs by itself on every streamed token.
  // Scroll close is scoped in setupTooltipCloseBehavior instead — leaving this
  // flag on would close tooltips during streaming regardless of that scoping.
  it('leaves the library-wide scroll close off for the ~40 global anchors', () => {
    expect(renderedTooltipProps().globalCloseEvents.scroll).toBeFalsy()
  })

  it('installs the scoped close behaviour against the rendered tooltip instance', () => {
    const props = renderedTooltipProps()

    expect(setupTooltipCloseBehavior).toHaveBeenCalledTimes(1)

    const getTooltip = vi.mocked(setupTooltipCloseBehavior).mock.calls[0][0]
    const handle = { isOpen: true, activeAnchor: null, close: vi.fn() }
    props.ref.current = handle

    expect(getTooltip()).toBe(handle)
  })

  it('keeps hover as the only open event', () => {
    expect(renderedTooltipProps().openEvents).toEqual({ mouseover: true })
  })
})
