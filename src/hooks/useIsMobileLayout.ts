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

import { useSyncExternalStore } from 'react'

import { MOBILE_LAYOUT_MEDIA_QUERY } from '@/constants/mobileLayout'

const getMediaQueryList = (): MediaQueryList | undefined =>
  window.matchMedia?.(MOBILE_LAYOUT_MEDIA_QUERY)

const subscribe = (onChange: () => void) => {
  const mediaQueryList = getMediaQueryList()
  mediaQueryList?.addEventListener('change', onChange)
  return () => mediaQueryList?.removeEventListener('change', onChange)
}

/** The current value, for code that must not re-run when the layout changes (e.g. one-off effects). */
export const matchesMobileLayout = (): boolean => getMediaQueryList()?.matches ?? false

/** True while the viewport is narrower than the `lg` breakpoint (phones and portrait tablets). */
export const useIsMobileLayout = (): boolean => useSyncExternalStore(subscribe, matchesMobileLayout)
