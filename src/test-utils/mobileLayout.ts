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

// eslint-disable-next-line import/no-extraneous-dependencies
import { vi } from 'vitest'

import { MOBILE_LAYOUT_MEDIA_QUERY } from '@/constants/mobileLayout'

type ChangeListener = () => void

/**
 * Makes the global `window.matchMedia` mock (desktop by default, see setupTests) report the
 * mobile layout. `setMobile` crosses the breakpoint like a window resize, notifying subscribers;
 * `restore` puts the desktop mock back.
 */
export const mockMobileLayout = (isMobile = true) => {
  const matchMedia = vi.mocked(window.matchMedia)
  const desktopImplementation = matchMedia.getMockImplementation()
  const listeners = new Set<ChangeListener>()
  let matches = isMobile

  matchMedia.mockImplementation(
    (query: string) =>
      ({
        get matches() {
          return query === MOBILE_LAYOUT_MEDIA_QUERY && matches
        },
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: (_type: string, listener: ChangeListener) => listeners.add(listener),
        removeEventListener: (_type: string, listener: ChangeListener) =>
          listeners.delete(listener),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList)
  )

  return {
    setMobile: (next: boolean) => {
      matches = next
      listeners.forEach((listener) => listener())
    },
    restore: () => {
      if (desktopImplementation) matchMedia.mockImplementation(desktopImplementation)
    },
  }
}
