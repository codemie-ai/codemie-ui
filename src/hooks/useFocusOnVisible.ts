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

/**
 * Custom hook to automatically focus an input element when a component becomes visible
 * Useful for modals and dialogs to improve accessibility and user experience
 *
 * @param ref - React ref object pointing to the element to focus
 * @param isVisible - Boolean indicating whether the component is visible
 * @param delay - Optional delay in milliseconds before focusing (default: 100ms)
 *
 * @example
 * ```tsx
 * const MyModal = ({ visible, onHide }) => {
 *   const inputRef = useRef<HTMLInputElement>(null)
 *   useFocusOnVisible(inputRef, visible)
 *
 *   return (
 *     <Dialog visible={visible} onHide={onHide}>
 *       <Input ref={inputRef} placeholder="Enter name..." />
 *     </Dialog>
 *   )
 * }
 * ```
 */
export const useFocusOnVisible = (
  ref: RefObject<HTMLInputElement | HTMLTextAreaElement | HTMLElement | null>,
  isVisible: boolean,
  delay = 100
) => {
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    if (isVisible && ref.current) {
      timer = setTimeout(() => {
        ref.current?.focus()
      }, delay)
    }

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [isVisible, ref, delay])
}
