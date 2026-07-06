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

import { useCallback, useEffect, useRef, useState } from 'react'

import { usePolling } from '@/hooks/usePolling'
import toaster from '@/utils/toaster'

export interface PopupFeatures {
  width?: number
  height?: number
  features?: string
}

interface UsePopupWindowOptions {
  onClose?: () => void
  closeDetectionInterval?: number
}

interface UsePopupWindowReturn {
  open: (url: string, features?: PopupFeatures) => boolean
  close: () => void
  isOpen: boolean
}

const DEFAULT_WIDTH = 600
const DEFAULT_HEIGHT = 700
const DEFAULT_CLOSE_DETECTION_INTERVAL = 500

const buildFeaturesString = ({
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  features,
}: PopupFeatures = {}): string => features ?? `width=${width},height=${height}`

/**
 * React hook for managing a single popup browser window.
 *
 * Opens a popup via `window.open`, tracks its lifecycle reactively via
 * `isOpen`, and detects user-initiated closure. Because popup windows
 * don't emit a reliable cross-origin close event, closure is observed by
 * polling `window.closed` on an interval that runs only while a popup
 * is open.
 *
 * Design notes:
 * - `onClose` fires for **any** closure — programmatic or user-initiated —
 *   so callers have a single place to react to "popup is gone."
 * - `open()` returns a boolean (`true` on success, `false` if blocked).
 *   The raw `Window` reference is intentionally not exposed to keep the
 *   popup's lifecycle owned by the hook.
 * - The popup is closed automatically when the component unmounts.
 *
 * @param options.onClose - Fired whenever the popup transitions from open to closed.
 * @param options.closeDetectionInterval - Poll interval in ms for close detection. Defaults to 500.
 *
 * @example
 * ```tsx
 * const popup = usePopupWindow({ onClose: () => resetFlow() })
 *
 * const start = () => {
 *   if (!popup.open('https://example.com/auth', { width: 500, height: 600 })) {
 *     showError('Pop-up blocked')
 *   }
 * }
 *
 * return (
 *   <>
 *     <button onClick={start}>Sign in</button>
 *     {popup.isOpen && <button onClick={popup.close}>Cancel</button>}
 *   </>
 * )
 * ```
 */
export const usePopupWindow = ({
  onClose,
  closeDetectionInterval = DEFAULT_CLOSE_DETECTION_INTERVAL,
}: UsePopupWindowOptions = {}): UsePopupWindowReturn => {
  const popupRef = useRef<Window | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  const markClosed = useCallback(() => {
    if (!popupRef.current) return
    popupRef.current = null
    setIsOpen(false)
    onCloseRef.current?.()
  }, [])

  const open = useCallback((url: string, features?: PopupFeatures): boolean => {
    const popup = window.open(url, '_blank', buildFeaturesString(features))
    if (!popup) {
      toaster.error('Pop-up blocked — please allow pop-ups for this site.')
      return false
    }
    popupRef.current = popup
    setIsOpen(true)
    return true
  }, [])

  const close = useCallback(() => {
    popupRef.current?.close()
    markClosed()
  }, [markClosed])

  usePolling({
    fetchFn: useCallback(async () => {
      if (popupRef.current?.closed) {
        markClosed()
      }
    }, [markClosed]),
    enabled: isOpen,
    interval: closeDetectionInterval,
  })

  useEffect(() => {
    return () => {
      popupRef.current?.close()
      popupRef.current = null
    }
  }, [])

  return { open, close, isOpen }
}
