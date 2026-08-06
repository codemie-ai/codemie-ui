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

import { useCallback, useEffect, useRef } from 'react'

import { CHAT_CONFIG_DEFAULT_WIDTH } from './chatConfigWidth'

import type { PanelImperativeHandle, PanelSize } from 'react-resizable-panels'

interface UseChatConfigResizeOptions {
  isConfigVisible: boolean
  onClose: () => void
  onOpen: () => void
}

export const useChatConfigResize = ({
  isConfigVisible,
  onClose,
  onOpen,
}: UseChatConfigResizeOptions) => {
  const panelRef = useRef<PanelImperativeHandle>(null)
  // Track current visibility in a ref so handleResize can read it without being re-created
  const isConfigVisibleRef = useRef(isConfigVisible)
  isConfigVisibleRef.current = isConfigVisible

  const handleResize = useCallback(
    (panelSize: PanelSize) => {
      if (panelSize.inPixels === 0 && isConfigVisibleRef.current) {
        onClose()
      } else if (panelSize.inPixels > 0 && !isConfigVisibleRef.current) {
        onOpen()
      }
    },
    [onClose, onOpen]
  )

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    if (isConfigVisible && panel.isCollapsed()) {
      panel.resize(CHAT_CONFIG_DEFAULT_WIDTH)
    } else if (!isConfigVisible && !panel.isCollapsed()) {
      panel.collapse()
    }
  }, [isConfigVisible])

  return { panelRef, handleResize }
}
