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

import React, { useCallback, useMemo, useState } from 'react'

import { bindSharing, SharePopup, ShareLinkSection } from '@/components/sharing'
import { hostedApplicationsStore } from '@/store/hostedApplications'
import { userStore } from '@/store/user'
import type { HostedApplication } from '@/types/entity/hostedApplication'
import { getRootPath } from '@/utils/helpers'

import { canShare, suspensionRefuses } from './hostedAccess'
import { hostedRoutes } from './hostedRoutes'

interface HostedSharePopupProps {
  app: HostedApplication
  visible: boolean
  onHide: () => void
  onChanged?: () => void
}

// Grants are view-only (D9); the assistant popup states its own access the same way.
const RECIPIENT_ACCESS = "People you add can open the active version. They can't edit it."

const VIA_LINK_NOTE = 'They can come back through the link until you revoke it.'

const SUSPENDED_NOTICE =
  'This application is suspended. You can remove access, but not share it until a moderator reinstates it.'

const buildUrl = (token: string) => getRootPath() + hostedRoutes.share.url(token)

const HostedSharePopup: React.FC<HostedSharePopupProps> = ({ app, visible, onHide, onChanged }) => {
  const { id } = app
  const mayGrant = !suspensionRefuses(app, 'share_on')
  // Revoking removes every grant that came through the link, so the people with access reload.
  const [refreshKey, setRefreshKey] = useState(0)

  const currentUserId = userStore.user?.userId
  const sharing = useMemo(
    () => bindSharing(hostedApplicationsStore.sharing, id, currentUserId),
    [id, currentUserId]
  )

  const share = useCallback(
    async (ids: string[]) => {
      await sharing.share(ids)
      onChanged?.()
    },
    [sharing, onChanged]
  )

  const unshare = useCallback(
    async (ids: string[]) => {
      await sharing.unshare(ids)
      onChanged?.()
    },
    [sharing, onChanged]
  )

  const getLink = useCallback(() => hostedApplicationsStore.getShareLink(id), [id])
  const createLink = useCallback(() => hostedApplicationsStore.createShareLink(id), [id])
  const revokeLink = useCallback(async () => {
    await hostedApplicationsStore.revokeShareLink(id)
    setRefreshKey((value) => value + 1)
    onChanged?.()
  }, [id, onChanged])

  if (!canShare(app)) return null

  return (
    <SharePopup
      visible={visible}
      onHide={onHide}
      header={`Share "${app.name}"`}
      headerDescription={RECIPIENT_ACCESS}
      searchUsers={sharing.searchUsers}
      share={share}
      unshare={unshare}
      loadSharedWith={sharing.loadSharedWith}
      entityKey={id}
      refreshKey={refreshKey}
      canGrant={mayGrant}
      notice={mayGrant ? undefined : SUSPENDED_NOTICE}
      texts={{
        shared: 'Application sharing updated.',
        shareFailed: 'Failed to share the application with some users. Please try again.',
        unshared: 'User removed from application sharing.',
        unshareFailed: 'Failed to remove user. Please try again.',
        viaLinkNote: VIA_LINK_NOTE,
      }}
      extra={
        <ShareLinkSection
          getLink={getLink}
          createLink={createLink}
          revokeLink={revokeLink}
          buildUrl={buildUrl}
          canCreate={mayGrant}
        />
      }
    />
  )
}

export default HostedSharePopup
