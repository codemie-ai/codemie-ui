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

import { useCallback, useMemo, useRef, type RefObject } from 'react'

import { createMountOrderStack, useTopmostEntry } from '@/hooks/useMountOrderStack'

// Every open dialog registers here, so "which dialog is on top" is React state rather than a
// document-wide query re-run on each keypress. Shared by the focus trap and the Escape handler.
const dialogStack = createMountOrderStack<HTMLElement>()

// The Proxy post-filters PrimeReact's FocusTrap sentinel elements
// (data-p-hidden-focusable="true") via Array.from + filter rather than CSS
// concatenation, which would only apply :not() to the last rule in the
// comma-separated FOCUSABLE_SELECTOR.
function createFocusableElementsProxy(target: HTMLElement): HTMLElement {
  return new Proxy(target, {
    get(proxyTarget, prop) {
      if (prop === 'querySelectorAll') {
        return (selector: string): NodeListOf<HTMLElement> =>
          Array.from(proxyTarget.querySelectorAll<HTMLElement>(selector)).filter(
            (child) => child.getAttribute('data-p-hidden-focusable') !== 'true'
          ) as unknown as NodeListOf<HTMLElement>
      }
      const value = Reflect.get(proxyTarget, prop, proxyTarget)
      return typeof value === 'function' ? value.bind(proxyTarget) : value
    },
  })
}

/**
 * Tracks whether the calling dialog is the topmost open dialog, exposing that single fact as
 * `isTopmost` so the focus trap and the Escape handler share one check instead of each re-deriving
 * "am I on top" from the mount-order stack.
 */
export const useTopmostDialog = (
  visible: boolean
): {
  registerDialog: (marker: HTMLDivElement | null) => void
  dialogContainerRef: RefObject<HTMLElement | null>
  isTopmost: boolean
} => {
  const dialogRef = useRef<HTMLElement | null>(null)
  const unregisterRef = useRef<(() => void) | null>(null)

  // A callback ref rather than an effect: PrimeReact mounts its portal on its own schedule, so the
  // dialog element does not exist on the render where `visible` flips. The ref fires whenever the
  // marker actually attaches, which sidesteps that race without polling the DOM.
  const registerDialog = useCallback(
    (marker: HTMLDivElement | null) => {
      unregisterRef.current?.()
      unregisterRef.current = null
      dialogRef.current = null

      const dialog = visible ? marker?.closest<HTMLElement>('[role="dialog"]') : null
      if (!dialog) return

      dialogRef.current = dialog
      unregisterRef.current = dialogStack.register(dialog)
    },
    [visible]
  )

  const topmostDialog = useTopmostEntry(dialogStack)
  const isTopmost = dialogRef.current !== null && dialogRef.current === topmostDialog

  const dialogContainerRef = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current(): HTMLElement | null {
        // Non-topmost dialogs must be inactive: PrimeReact portals each dialog to document.body as
        // a sibling, so the outer trap's container.contains(activeEl) is false when focus is in an
        // inner dialog — it would redirect focus to itself.
        const dialog = dialogRef.current
        if (!isTopmost || !dialog) return null
        return createFocusableElementsProxy(dialog)
      },
    }),
    [isTopmost]
  )

  return { registerDialog, dialogContainerRef, isTopmost }
}
