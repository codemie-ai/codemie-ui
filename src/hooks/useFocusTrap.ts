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

import { useEffect, RefObject } from 'react'

export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Traps keyboard focus within a container element while active.
 * Tab wraps from last to first focusable element; Shift+Tab wraps from first to last.
 * If focus escapes the container while active, it is redirected to the first focusable element.
 *
 * @param containerRef - Ref to the element that should contain focus
 * @param isActive - Whether the focus trap is currently active
 */
export const useFocusTrap = (
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean
): void => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const container = containerRef.current
      if (!container) return

      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      )
      if (focusableElements.length === 0) return

      const firstEl = focusableElements[0]
      const lastEl = focusableElements[focusableElements.length - 1]
      const activeEl = document.activeElement as HTMLElement

      if (!container.contains(activeEl)) {
        e.preventDefault()
        firstEl.focus()
        return
      }

      if (e.shiftKey) {
        if (activeEl === firstEl) {
          e.preventDefault()
          lastEl.focus()
        }
      } else if (activeEl === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    if (isActive) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      if (isActive) {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isActive, containerRef])
}
