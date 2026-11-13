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

import { Dialog } from 'primereact/dialog'
import { RefObject, useCallback, useEffect, useState } from 'react'

export const BUSY_HINT_DELAY_MS = 5000

interface UsePopupBusyOptions {
  busy: boolean
  hasBusyHint: boolean
  visible: boolean
  onHide: () => void
  dialogRef: RefObject<Dialog | null>
}

// Locks a Popup while an uncancellable action runs: every dismissal path goes through
// handleHide, focus stays inside the dialog, and the hint shows only once the wait gets long.
export const usePopupBusy = ({
  busy,
  hasBusyHint,
  visible,
  onHide,
  dialogRef,
}: UsePopupBusyOptions) => {
  const handleHide = useCallback(() => {
    if (busy) return
    onHide()
  }, [busy, onHide])

  // A disabled submit button drops focus to <body>, outside the focus trap.
  useEffect(() => {
    if (busy && visible) dialogRef.current?.getContent()?.focus()
  }, [busy, visible, dialogRef])

  // Keyed on a boolean, not the hint node: a JSX hint is a new object on every parent render and
  // would restart the timer each time.
  const [showBusyHint, setShowBusyHint] = useState(false)
  useEffect(() => {
    if (!busy || !hasBusyHint) {
      setShowBusyHint(false)
      return () => {}
    }
    const timer = setTimeout(() => setShowBusyHint(true), BUSY_HINT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [busy, hasBusyHint])

  return { handleHide, showBusyHint }
}
