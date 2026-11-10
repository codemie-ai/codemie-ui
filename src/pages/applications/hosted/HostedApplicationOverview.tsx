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

import { useHref } from 'react-router'

import DetailsCopyField from '@/components/details/DetailsCopyField'
import DetailsProperty from '@/components/details/DetailsProperty'
import DetailsSidebar from '@/components/details/DetailsSidebar'
import DetailsSidebarSection from '@/components/details/DetailsSidebar/components/DetailsSidebarSection'
import { SharedWithList, SharedWithLoadError } from '@/components/sharing'
import { userStore } from '@/store/user'
import type { HostedApplication, HostedVersion } from '@/types/entity/hostedApplication'
import type { SharedWithUser } from '@/types/entity/sharing'
import { isProjectMember } from '@/utils/entity'
import { formatDateTime } from '@/utils/helpers'
import { getSharedValue } from '@/utils/utils'

import { canOpen, isCreator, isManager, isSuspended } from './hostedAccess'
import HostedApplicationCover from './HostedApplicationCover'
import { hostedRoutes } from './hostedRoutes'

interface Props {
  application: HostedApplication
  versions: HostedVersion[]
  className?: string
  /** The creator's list of people with access; omitted for everyone else. */
  sharedWith?: SharedWithUser[]
  /** The creator's list could not be loaded; shown instead of an empty list. */
  sharedWithFailed?: boolean
  onRetrySharedWith?(): void
  /**
   * Whether anyone was granted access by name or by link. Only the creator can read the grants,
   * so it is undefined (unknown) for everyone else.
   */
  hasGrants?: boolean
}

const KIND_LABEL = { html: 'HTML file', zip: 'Static bundle (ZIP)' } as const

const versionLabel = (versions: HostedVersion[], id?: string | null) => {
  if (!id) return null
  const version = versions.find((item) => item.id === id)
  return version ? 'v' + version.sequence : null
}

// `app.shared` is the "Shared with project" switch; grants by name or link are separate.
const accessHint = (app: HostedApplication, hasGrants: boolean | undefined) => {
  if (isSuspended(app)) return 'Access is suspended by a moderator.'
  if (!isManager(app)) return 'Only signed-in members of your organization can open it.'
  if (app.is_global) return 'Anyone in your organization can open it from the Marketplace.'
  if (app.shared) {
    const members = app.project ? `Members of the ${app.project} project` : 'Project members'
    return hasGrants === false
      ? `${members} can open this link.`
      : `${members} and people it is shared with can open this link.`
  }
  if (hasGrants === false) return 'Only you can open this link until you share it.'
  return 'People it is shared with can open this link.'
}

const HostedApplicationOverview = ({
  application: app,
  versions,
  sharedWith,
  sharedWithFailed = false,
  onRetrySharedWith,
  hasGrants,
  className,
}: Props) => {
  const link = useHref(hostedRoutes.view(app.id))
  const standaloneLink = useHref(hostedRoutes.standalone(app.id))
  const owner = isManager(app)

  const active = versionLabel(versions, app.active_version_id)
  const preview = versionLabel(versions, app.selected_version_id)
  return (
    <DetailsSidebar classNames={className}>
      <DetailsSidebarSection headline="PREVIEW">
        <div className="aspect-card-cover overflow-hidden rounded-lg border border-border-structural">
          <HostedApplicationCover application={app} />
        </div>
      </DetailsSidebarSection>
      <DetailsSidebarSection headline="OVERVIEW" itemsWrapperClassName="gap-2 -mt-2">
        {!owner && <DetailsProperty label="Publisher" value={app.publisher.display_name} />}
        <DetailsProperty label="Project" value={app.project} />
        {/* The same label and audience as the assistant details' "Shared status". */}
        {(app.is_global ||
          isCreator(app, userStore.user?.userId) ||
          isProjectMember(app, userStore.user?.projects)) && (
          <DetailsProperty
            label="Shared status"
            value={getSharedValue(app.is_global, app.shared)}
          />
        )}
        <DetailsProperty label="Type" value={app.artifact_kind && KIND_LABEL[app.artifact_kind]} />
        {(owner || !canOpen(app)) && (
          <DetailsProperty
            label="Active version"
            value={canOpen(app) ? active : 'No active version yet'}
          />
        )}
        {owner && <DetailsProperty label="Preview version" value={preview} />}
        <DetailsProperty label="Updated" value={formatDateTime(app.updated_at, 'relative')} />
        {app.created_at && (
          <DetailsProperty label="Created" value={formatDateTime(app.created_at, 'day')} />
        )}
      </DetailsSidebarSection>
      {sharedWith && (
        <DetailsSidebarSection headline="Shared with">
          {sharedWithFailed && onRetrySharedWith && (
            <SharedWithLoadError onRetry={onRetrySharedWith} />
          )}
          {!sharedWithFailed && sharedWith.length > 0 && <SharedWithList users={sharedWith} />}
          {!sharedWithFailed && !sharedWith.length && (
            <p className="text-xs text-text-quaternary">Not shared with anyone yet.</p>
          )}
        </DetailsSidebarSection>
      )}
      <DetailsSidebarSection headline="ACCESS LINK">
        <DetailsCopyField
          label="Application link"
          value={window.location.origin + link}
          notification="Application link copied to clipboard"
        />
        <DetailsCopyField
          label="Standalone link (own tab, without CodeMie)"
          value={window.location.origin + standaloneLink}
          notification="Standalone link copied to clipboard"
        />
        <p className="-mt-2 text-xs text-text-quaternary">{accessHint(app, hasGrants)}</p>
      </DetailsSidebarSection>
    </DetailsSidebar>
  )
}

export default HostedApplicationOverview
