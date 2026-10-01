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

// The app's content area, below the mobile top bar (set in App.tsx).
export const APP_CONTENT_SELECTOR = '[data-app-content]'

const NESTED_LAYER_SELECTOR = 'dialog, [role="dialog"], [role="menu"], [role="listbox"]'

/**
 * Whether focus is in a dialog, menu or list box. Those close on Escape themselves, so a mobile
 * overlay under them stays open until they are gone.
 */
export const isNestedLayerFocused = (): boolean =>
  !!document.activeElement?.closest(NESTED_LAYER_SELECTOR)

/**
 * Makes the app content behind a mobile overlay inert: the keyboard and screen readers cannot
 * reach what the overlay covers, while the overlay itself and the top bar stay usable.
 * Returns the function that undoes it.
 */
export const makeContentBehindInert = (overlay: HTMLElement): (() => void) => {
  const root = overlay.closest(APP_CONTENT_SELECTOR)
  if (!root) return () => undefined

  // The overlay and its ancestors up to the content root stay usable; their siblings do not.
  const path: Element[] = []
  for (let node: Element | null = overlay; node && node !== root; node = node.parentElement) {
    path.push(node)
  }
  const inertElements = path.flatMap((element) =>
    Array.from(element.parentElement?.children ?? []).filter(
      (sibling) => sibling !== element && !sibling.hasAttribute('inert')
    )
  )
  inertElements.forEach((element) => element.setAttribute('inert', ''))

  return () => inertElements.forEach((element) => element.removeAttribute('inert'))
}
