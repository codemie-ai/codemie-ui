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

import { useCallback, useRef, useState } from 'react'
import { PanelImperativeHandle, PanelSize, useDefaultLayout } from 'react-resizable-panels'
import { useSnapshot } from 'valtio'

import { userStore } from '@/store'

export const MIN_COLLAPSED_SIZE = 50
const DRAWER_SIZE_STORAGE_KEY = 'workflow-drawer-size'
const MIN_EXPANDED_SIZE = 150

export const useWorkflowDrawer = () => {
  const { user } = useSnapshot(userStore)
  const userId = user?.userId ?? 'default'

  const panelRef = useRef<PanelImperativeHandle>(null)
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(true)

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: `workflow-drawer-${userId}`,
    storage: localStorage,
  })

  const handleResize = useCallback((panelSize: PanelSize) => {
    const size = panelSize.inPixels

    if (size <= MIN_COLLAPSED_SIZE) {
      setIsDrawerExpanded(false)
    } else {
      setIsDrawerExpanded(true)
    }
  }, [])

  const handleDrawerExpandChange = useCallback(
    (isExpanded: boolean) => {
      if (isExpanded) {
        panelRef.current?.expand()

        // Try to restore size from localStorage
        const savedSize = localStorage.getItem(`${DRAWER_SIZE_STORAGE_KEY}-${userId}`)
        const sizeToApply = savedSize ? parseInt(savedSize, 10) : MIN_EXPANDED_SIZE

        // Apply saved size if it's >= 300, otherwise default to 300
        if (sizeToApply >= MIN_EXPANDED_SIZE) {
          panelRef.current?.resize(sizeToApply)
        } else {
          panelRef.current?.resize(MIN_EXPANDED_SIZE)
        }
      } else {
        // Save current size before collapsing (if >= 300)
        const currentSize = panelRef.current?.getSize().inPixels ?? 0
        if (currentSize >= MIN_EXPANDED_SIZE) {
          localStorage.setItem(`${DRAWER_SIZE_STORAGE_KEY}-${userId}`, currentSize.toString())
        }
        panelRef.current?.collapse()
      }
      setIsDrawerExpanded(isExpanded)
    },
    [userId]
  )

  return {
    panelRef,
    isDrawerExpanded,
    defaultLayout,
    onLayoutChanged,
    handleResize,
    handleDrawerExpandChange,
  }
}
