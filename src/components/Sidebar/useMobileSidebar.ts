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

import { RefObject, useCallback, useEffect } from 'react'
import { useSnapshot } from 'valtio'

import { useEscapeKey } from '@/hooks/useEscapeKey'
import { useIsMobileLayout } from '@/hooks/useIsMobileLayout'
import { appInfoStore } from '@/store/appInfo'
import { isNestedLayerFocused, makeContentBehindInert } from '@/utils/mobileOverlay'

/**
 * On mobile a page sidebar is an overlay opened from the top bar, which needs to know it exists.
 * The sidebar stays mounted while closed, so page filters and lists living in it keep their state.
 * While it is open, the page it covers is inert and Escape closes it.
 */
export const useMobileSidebar = (sidebarRef: RefObject<HTMLElement | null>) => {
  const isMobileLayout = useIsMobileLayout()
  const { mobileSidebarOpen } = useSnapshot(appInfoStore)
  const isOverlayOpen = isMobileLayout && mobileSidebarOpen

  useEffect(
    () => (isMobileLayout ? appInfoStore.registerPageSidebar() : undefined),
    [isMobileLayout]
  )

  const closeMobileSidebar = useCallback(() => {
    if (!isNestedLayerFocused()) appInfoStore.setMobileSidebarOpen(false)
  }, [])
  useEscapeKey(closeMobileSidebar, isOverlayOpen)

  useEffect(() => {
    const sidebar = sidebarRef.current
    return isOverlayOpen && sidebar ? makeContentBehindInert(sidebar) : undefined
  }, [isOverlayOpen, sidebarRef])

  return { isMobileLayout, isMobileSidebarOpen: mobileSidebarOpen }
}
