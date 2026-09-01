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

import { FC, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import Announcement from '@/components/Announcement/Announcement'
import { useAnnouncementQueue } from '@/hooks/useAnnouncementQueue'
import { setToasterAnnouncer } from '@/utils/toaster'

import { useAnnouncerHost } from './AnnouncerHostContext'

/**
 * Mounts a single polite live region and routes every toast the app emits into it.
 *
 * Toastify writes the visual toast directly into #toast-container via DOM insertion, which screen
 * readers do not reliably announce. This component wires `toaster` into a React-owned
 * <Announcement> so the same text also reaches assistive tech (WCAG 4.1.3). Mount once, above
 * every route path that produces toasts.
 *
 * The region is portalled rather than left in the React tree it is rendered from, because two
 * things make a statically placed region silent:
 *
 * 1. Modal panels hide the rest of the app from assistive tech with `aria-hidden="true"` on `#app`
 *    (see NavigationProfile). A region inside that subtree is dropped from the accessibility tree.
 * 2. While a modal is open, assistive tech restricts itself to that dialog: VoiceOver ignores live
 *    regions outside it, and Chromium drops them as well (w3c/aria#1854).
 *
 * The open modal declares itself through <ModalAnnouncerHost />; the region goes to the topmost such
 * host and falls back to `<body>` when none is registered — the placement audible in both states.
 */
const ToasterAnnouncer: FC = () => {
  const { announcement, announce } = useAnnouncementQueue()
  const host = useAnnouncerHost()
  const [container] = useState(() => document.createElement('div'))
  const announcementRef = useRef('')
  // Where the container was last parked. Read from the DOM instead and the answer is always `null`,
  // because this effect's own cleanup detaches the node before the next run compares.
  const placedRef = useRef<HTMLElement | null>(null)

  announcementRef.current = announcement

  useEffect(() => {
    const target = host ?? document.body
    const moved = placedRef.current !== null && placedRef.current !== target

    placedRef.current = target
    target.appendChild(container)
    // Moving the node resets the region for assistive tech: whatever it was saying would be lost
    // mid-sentence. Say it again from the new host — the confirm-then-close flows depend on it.
    if (moved && announcementRef.current) announce(announcementRef.current)
  }, [announce, container, host])

  useEffect(() => () => container.remove(), [container])

  useEffect(() => {
    setToasterAnnouncer(announce)
    // Clear only if the slot still holds this instance's `announce` — a stale unmount (HMR,
    // accidental second mount) must not evict a fresher registration.
    return () => setToasterAnnouncer(null, announce)
  }, [announce])

  return createPortal(<Announcement announcement={announcement} />, container)
}

export default ToasterAnnouncer
