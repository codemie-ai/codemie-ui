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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  setupTooltipCloseBehavior,
  USER_SCROLL_INTENT_WINDOW_MS,
  type GlobalTooltipHandle,
} from '@/utils/tooltipCloseBehavior'

const createHandle = (activeAnchor: HTMLElement | null, isOpen = true): GlobalTooltipHandle => ({
  isOpen,
  activeAnchor,
  close: vi.fn(),
})

const buildDom = () => {
  const scrollParent = document.createElement('div')
  const anchor = document.createElement('button')
  scrollParent.appendChild(anchor)

  const unrelatedScrollParent = document.createElement('div')
  unrelatedScrollParent.appendChild(document.createElement('span'))

  document.body.append(scrollParent, unrelatedScrollParent)

  return { scrollParent, anchor, unrelatedScrollParent }
}

const userWheelOn = (element: Element) => {
  element.dispatchEvent(new Event('wheel', { bubbles: true }))
}

const scrollOn = (target: EventTarget) => {
  // Scroll events do not bubble, which is exactly why the listener captures.
  target.dispatchEvent(new Event('scroll'))
}

describe('setupTooltipCloseBehavior — scroll', () => {
  let teardown: () => void

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    teardown?.()
    vi.useRealTimers()
  })

  // The regression the app-wide `globalCloseEvents.scroll` introduced: the chat
  // history scrolls itself to the bottom on every streamed token, and every
  // tooltip anchored inside it (message toolbars, avatars, badges) has that
  // container as its scroll parent. A tooltip the user is reading must survive
  // a scroll nobody asked for.
  it('keeps the tooltip open when its scroll parent is scrolled programmatically', () => {
    const { scrollParent, anchor } = buildDom()
    const handle = createHandle(anchor)
    teardown = setupTooltipCloseBehavior(() => handle)

    scrollOn(scrollParent)

    expect(handle.close).not.toHaveBeenCalled()
  })

  it('keeps the tooltip open when the page is scrolled programmatically', () => {
    const { anchor } = buildDom()
    const handle = createHandle(anchor)
    teardown = setupTooltipCloseBehavior(() => handle)

    scrollOn(document)

    expect(handle.close).not.toHaveBeenCalled()
  })

  // The original bug: a tooltip opened over a dropdown row survived the list
  // scrolling and stranded at the viewport corner.
  it('closes the tooltip when the user scrolls the list its anchor sits in', () => {
    const { scrollParent, anchor } = buildDom()
    const handle = createHandle(anchor)
    teardown = setupTooltipCloseBehavior(() => handle)

    userWheelOn(scrollParent)
    scrollOn(scrollParent)

    expect(handle.close).toHaveBeenCalledTimes(1)
  })

  it('closes the tooltip when the user scrolls the page', () => {
    const { anchor } = buildDom()
    const handle = createHandle(anchor)
    teardown = setupTooltipCloseBehavior(() => handle)

    userWheelOn(document.body)
    scrollOn(document)

    expect(handle.close).toHaveBeenCalledTimes(1)
  })

  it('closes the tooltip while the user drags a scrollbar, with no wheel event at all', () => {
    const { scrollParent, anchor } = buildDom()
    const handle = createHandle(anchor)
    teardown = setupTooltipCloseBehavior(() => handle)

    scrollParent.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    scrollOn(scrollParent)

    expect(handle.close).toHaveBeenCalledTimes(1)
  })

  it('leaves the tooltip alone when an unrelated container is scrolled by the user', () => {
    const { anchor, unrelatedScrollParent } = buildDom()
    const handle = createHandle(anchor)
    teardown = setupTooltipCloseBehavior(() => handle)

    userWheelOn(unrelatedScrollParent)
    scrollOn(unrelatedScrollParent)

    expect(handle.close).not.toHaveBeenCalled()
  })

  it('stops treating scrolls as user-driven once the intent window has passed', () => {
    vi.useFakeTimers()
    const { scrollParent, anchor } = buildDom()
    const handle = createHandle(anchor)
    teardown = setupTooltipCloseBehavior(() => handle)

    userWheelOn(scrollParent)
    vi.advanceTimersByTime(USER_SCROLL_INTENT_WINDOW_MS + 1)
    scrollOn(scrollParent)

    expect(handle.close).not.toHaveBeenCalled()
  })

  it('does nothing when no tooltip is open', () => {
    const { scrollParent, anchor } = buildDom()
    const handle = createHandle(anchor, false)
    teardown = setupTooltipCloseBehavior(() => handle)

    userWheelOn(scrollParent)
    scrollOn(scrollParent)

    expect(handle.close).not.toHaveBeenCalled()
  })

  it('closes the tooltip when its anchor is removed from the DOM', async () => {
    const { scrollParent, anchor } = buildDom()
    const handle = createHandle(anchor)
    teardown = setupTooltipCloseBehavior(() => handle)

    scrollParent.removeChild(anchor)

    await vi.waitFor(() => expect(handle.close).toHaveBeenCalledTimes(1))
  })

  it('closes the tooltip when a whole subtree containing the anchor is removed', async () => {
    const { scrollParent, anchor } = buildDom()
    const handle = createHandle(anchor)
    teardown = setupTooltipCloseBehavior(() => handle)

    scrollParent.remove()

    await vi.waitFor(() => expect(handle.close).toHaveBeenCalledTimes(1))
  })

  it('leaves the tooltip open while its anchor stays in the DOM', async () => {
    const { scrollParent, anchor, unrelatedScrollParent } = buildDom()
    const handle = createHandle(anchor)
    teardown = setupTooltipCloseBehavior(() => handle)

    unrelatedScrollParent.remove()
    scrollParent.appendChild(document.createElement('span'))

    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
    expect(handle.close).not.toHaveBeenCalled()
  })

  it('removes every listener it installed on teardown', async () => {
    const { scrollParent, anchor } = buildDom()
    const handle = createHandle(anchor)
    const stop = setupTooltipCloseBehavior(() => handle)
    teardown = () => {}

    stop()
    userWheelOn(scrollParent)
    scrollOn(scrollParent)
    anchor.remove()

    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
    expect(handle.close).not.toHaveBeenCalled()
  })
})
