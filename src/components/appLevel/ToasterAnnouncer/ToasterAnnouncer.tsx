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

import { FC, useEffect } from 'react'

import Announcement from '@/components/Announcement/Announcement'
import { useAnnouncementQueue } from '@/hooks/useAnnouncementQueue'
import { setToasterAnnouncer } from '@/utils/toaster'

/**
 * Mounts a single polite live region and routes every toast the app emits into it.
 *
 * Toastify writes the visual toast directly into #toast-container via DOM insertion, which screen
 * readers do not reliably announce. This component wires `toaster` into a React-owned
 * <Announcement> so the same text also reaches assistive tech (WCAG 4.1.3). Mount once, above
 * every route path that produces toasts.
 */
const ToasterAnnouncer: FC = () => {
  const { announcement, announce } = useAnnouncementQueue()

  useEffect(() => {
    setToasterAnnouncer(announce)
    // Clear only if the slot still holds this instance's `announce` — a stale unmount (HMR,
    // accidental second mount) must not evict a fresher registration.
    return () => setToasterAnnouncer(null, announce)
  }, [announce])

  return <Announcement announcement={announcement} />
}

export default ToasterAnnouncer
