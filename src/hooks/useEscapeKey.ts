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

import { useEffect } from 'react'

/**
 * Custom hook to handle Escape key press
 * Useful for closing modals, dialogs, or other dismissible UI elements
 *
 * @param onEscape - Callback function to execute when Escape key is pressed
 * @param isActive - Whether the escape key listener should be active (default: true)
 *
 * @example
 * ```tsx
 * const MyModal = ({ visible, onHide }) => {
 *   useEscapeKey(onHide, visible)
 *   return <div>Modal content</div>
 * }
 * ```
 */
export const useEscapeKey = (onEscape: () => void, isActive = true) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape()
      }
    }

    if (isActive) {
      window.addEventListener('keydown', handleEscape)
    }

    return () => {
      if (isActive) {
        window.removeEventListener('keydown', handleEscape)
      }
    }
  }, [onEscape, isActive])
}
