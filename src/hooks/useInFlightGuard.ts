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

// Guards an async action against re-entry. The ref answers synchronously, so a double click or a
// second Enter in the same tick is rejected before the state update has rendered; the state
// drives the UI.
export const useInFlightGuard = () => {
  const inFlightRef = useRef(false)
  const [inFlight, setInFlight] = useState(false)

  /** Marks the action as started. Returns false when it is already in flight. */
  const tryBegin = useCallback(() => {
    if (inFlightRef.current) return false
    inFlightRef.current = true
    setInFlight(true)
    return true
  }, [])

  const end = useCallback(() => {
    inFlightRef.current = false
    setInFlight(false)
  }, [])

  return { inFlight, tryBegin, end }
}
