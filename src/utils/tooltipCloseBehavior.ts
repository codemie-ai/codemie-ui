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

/**
 * Scoped close behaviour for the single global react-tooltip instance.
 *
 * `globalCloseEvents.scroll` would do most of this for us, but it closes on
 * *any* scroll of the anchor's scroll parent, and the chat history scrolls
 * itself to the bottom on every streamed token. That turned a fix for one
 * dropdown into "tooltips vanish while a response streams" for every anchor
 * inside the message list. So the scroll close lives here instead, where it can
 * ask two questions the library cannot:
 *
 *   1. did the *user* cause this scroll? (programmatic scrolls are ignored)
 *   2. does the scrolled element actually move the anchor? (unrelated
 *      containers are ignored)
 *
 * It also closes the tooltip when its anchor leaves the DOM — filtering a
 * combobox list unmounts the hovered row without any scroll or resize event,
 * and react-tooltip leaves the overlay stranded at the viewport corner.
 */

/** The slice of react-tooltip's imperative ref this module needs. */
export interface GlobalTooltipHandle {
  isOpen: boolean
  activeAnchor: HTMLElement | null
  close: () => void
}

/**
 * How long a user gesture keeps counting as "the user is scrolling". Wheel and
 * touch gestures emit their own events well before the scroll they cause, and
 * momentum keeps scrolling after the last one.
 */
export const USER_SCROLL_INTENT_WINDOW_MS = 700

// Enter is deliberately absent: sending a chat message scrolls the history, and
// that scroll is no more the user's doing than a streamed token is.
const SCROLL_KEYS = new Set([
  ' ',
  'Spacebar',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
])

const CAPTURE_PASSIVE: AddEventListenerOptions = { capture: true, passive: true }

export const setupTooltipCloseBehavior = (
  getTooltip: () => GlobalTooltipHandle | null
): (() => void) => {
  if (typeof document === 'undefined') return () => {}

  let lastIntentAt = Number.NEGATIVE_INFINITY
  let pointerIsDown = false

  const markIntent = () => {
    lastIntentAt = Date.now()
  }

  const handleKeyDown = (event: Event) => {
    if (SCROLL_KEYS.has((event as KeyboardEvent).key)) markIntent()
  }

  // A scrollbar drag emits no wheel events at all, and can outlast the intent
  // window while the button is held.
  const handlePointerDown = () => {
    pointerIsDown = true
    markIntent()
  }

  const handlePointerUp = () => {
    pointerIsDown = false
    markIntent()
  }

  const userIsScrolling = () =>
    pointerIsDown || Date.now() - lastIntentAt < USER_SCROLL_INTENT_WINDOW_MS

  const openTooltip = () => {
    const tooltip = getTooltip()
    return tooltip?.isOpen ? tooltip : null
  }

  const scrollMovesAnchor = (target: EventTarget | null, anchor: HTMLElement) => {
    if (target === document || target === document.documentElement || target === document.body) {
      return true
    }
    return target instanceof Node && target.contains(anchor)
  }

  // Scroll events do not bubble, so this captures instead.
  const handleScroll = (event: Event) => {
    const tooltip = openTooltip()
    if (!tooltip?.activeAnchor) return
    if (!userIsScrolling()) return
    if (scrollMovesAnchor(event.target, tooltip.activeAnchor)) tooltip.close()
  }

  const handleDomMutation = () => {
    const tooltip = openTooltip()
    if (!tooltip?.activeAnchor) return
    if (!tooltip.activeAnchor.isConnected) tooltip.close()
  }

  document.addEventListener('scroll', handleScroll, CAPTURE_PASSIVE)
  document.addEventListener('wheel', markIntent, CAPTURE_PASSIVE)
  document.addEventListener('touchmove', markIntent, CAPTURE_PASSIVE)
  document.addEventListener('keydown', handleKeyDown, CAPTURE_PASSIVE)
  document.addEventListener('pointerdown', handlePointerDown, CAPTURE_PASSIVE)
  document.addEventListener('pointerup', handlePointerUp, CAPTURE_PASSIVE)
  document.addEventListener('pointercancel', handlePointerUp, CAPTURE_PASSIVE)

  const anchorObserver = new MutationObserver(handleDomMutation)
  anchorObserver.observe(document.documentElement, { childList: true, subtree: true })

  return () => {
    document.removeEventListener('scroll', handleScroll, CAPTURE_PASSIVE)
    document.removeEventListener('wheel', markIntent, CAPTURE_PASSIVE)
    document.removeEventListener('touchmove', markIntent, CAPTURE_PASSIVE)
    document.removeEventListener('keydown', handleKeyDown, CAPTURE_PASSIVE)
    document.removeEventListener('pointerdown', handlePointerDown, CAPTURE_PASSIVE)
    document.removeEventListener('pointerup', handlePointerUp, CAPTURE_PASSIVE)
    document.removeEventListener('pointercancel', handlePointerUp, CAPTURE_PASSIVE)
    anchorObserver.disconnect()
  }
}
