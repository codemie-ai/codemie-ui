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

import { FC, useLayoutEffect, useRef } from 'react'

import { useRegisterAnnouncerHost } from './AnnouncerHostContext'

type ModalAnnouncerHostProps = {
  /** Whether the surrounding modal is open. Pass the same flag that drives the dialog. */
  active?: boolean
}

/**
 * Offers this modal as the home of the app's live region while it is open.
 *
 * Render it inside the dialog element itself — inside the node carrying `role="dialog"` — so the
 * region it hosts stays within the subtree assistive tech is scoped to. One line per modal surface;
 * <ToasterAnnouncer /> portals into the topmost registered host.
 */
const ModalAnnouncerHost: FC<ModalAnnouncerHostProps> = ({ active = true }) => {
  const ref = useRef<HTMLDivElement>(null)
  const registerHost = useRegisterAnnouncerHost()

  useLayoutEffect(() => {
    const host = active ? ref.current : null

    return host ? registerHost(host) : undefined
  }, [active, registerHost])

  return <div ref={ref} className="sr-only" />
}

export default ModalAnnouncerHost
