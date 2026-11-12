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

import { useNavigate } from 'react-router'

import DiagramSvg from '@/assets/icons/diagram.svg?react'
import EyeSvg from '@/assets/icons/eye.svg?react'
import NotSharedSvg from '@/assets/icons/shared-no.svg?react'
import SharedSvg from '@/assets/icons/shared-yes.svg?react'
import Button from '@/components/Button'
import Card from '@/components/Card'
import NavigationMore from '@/components/NavigationMore/NavigationMore'
import type { NavigationMenuItem } from '@/components/NavigationMore/NavigationMore'
import { userStore } from '@/store/user'
import type { HostedApplication } from '@/types/entity/hostedApplication'
import { isProjectMember } from '@/utils/entity'
import { cn } from '@/utils/utils'

import { canOpen, isCreator, isManager, isSuspended, suspensionRefuses } from './hostedAccess'
import HostedApplicationCover from './HostedApplicationCover'
import { hostedRoutes } from './hostedRoutes'

import type { ReactNode } from 'react'

interface Props {
  application: HostedApplication
  menuItems?: NavigationMenuItem[]
  onOpen(application: HostedApplication): void
}

// One status line in the style of the assistant and skill cards: an icon and plain text.
const StatusItem = ({ icon, children }: { icon: ReactNode; children: string }) => (
  <span className="flex flex-row items-center gap-3 whitespace-nowrap text-xs">
    {icon}
    {children}
  </span>
)

/**
 * What a manager does next with an application that has nothing live. The list carries no version
 * list: an accepted version is auto-selected, so a selected one that is still allowed to run
 * (`artifact_kind` is set from it) can be activated; with nothing selected there is no ready version.
 */
const nextStepLabel = (app: HostedApplication) => {
  if (!app.selected_version_id) return 'Upload version'
  if (app.artifact_kind && !suspensionRefuses(app, 'activate')) return 'Activate version'
  return 'Manage'
}

const NO_ACTIVE_VERSION = 'No active version yet'

/** A state pinned to the cover; a solid fill keeps it readable over any uploaded image. */
const CoverBadge = ({
  id,
  tone,
  children,
}: {
  id?: string
  tone: 'neutral' | 'error'
  children: string
}) => (
  <span
    id={id}
    className={cn(
      'absolute right-2 top-2 whitespace-nowrap rounded-full border bg-surface-base-primary px-2.5 py-1 text-xs font-medium shadow-sm',
      tone === 'error'
        ? 'border-failed-secondary text-failed-secondary'
        : 'border-border-structural text-text-secondary'
    )}
  >
    {children}
  </span>
)

/**
 * View as an icon with a tooltip, so the card row keeps room for the status; the details page
 * labels it. A disabled button gets no pointer events, so its wrapper explains it.
 */
const OpenButtons = ({
  app,
  openable,
  noVersionId,
  onOpen,
}: {
  app: HostedApplication
  openable: boolean
  noVersionId: string
  onOpen(application: HostedApplication): void
}) => (
  <span
    className="inline-flex gap-2"
    data-tooltip-id={openable ? undefined : 'react-tooltip'}
    data-tooltip-content={openable ? undefined : NO_ACTIVE_VERSION}
  >
    <Button
      size="small"
      variant="secondary"
      disabled={!openable}
      aria-label={'View ' + app.name}
      aria-describedby={openable ? undefined : noVersionId}
      data-tooltip-id={openable ? 'react-tooltip' : undefined}
      data-tooltip-content={openable ? 'View' : undefined}
      onClick={() => onOpen(app)}
    >
      <EyeSvg aria-hidden className="size-4" />
    </Button>
  </span>
)

const HostedApplicationCard = ({ application: app, menuItems, onOpen }: Props) => {
  const navigate = useNavigate()
  const openable = canOpen(app)
  const suspended = isSuspended(app)
  const titleId = 'app-title-' + app.id
  const noVersionId = titleId + '-no-version'
  // As on assistant cards, project sharing is shown to the creator and project members only.
  const seesSharing =
    isCreator(app, userStore.user?.userId) || isProjectMember(app, userStore.user?.projects)
  const status = app.is_global ? (
    <StatusItem icon={<DiagramSvg />}>Marketplace</StatusItem>
  ) : (
    seesSharing && (
      <StatusItem icon={app.shared ? <SharedSvg /> : <NotSharedSvg />}>
        {app.shared ? 'Shared with project' : 'Not shared with project'}
      </StatusItem>
    )
  )
  // What keeps the app from running sits on its cover; suspension outranks a missing version.
  let coverBadge: ReactNode = null
  if (suspended) coverBadge = <CoverBadge tone="error">Suspended</CoverBadge>
  else if (!openable)
    coverBadge = (
      <CoverBadge id={noVersionId} tone="neutral">
        {NO_ACTIVE_VERSION}
      </CoverBadge>
    )
  return (
    <article aria-labelledby={titleId} className="min-w-0">
      <Card
        id={app.id}
        titleId={titleId}
        title={app.name}
        subtitle={
          isCreator(app, userStore.user?.userId)
            ? 'Created by you'
            : 'by ' + app.publisher.display_name
        }
        description={app.description}
        // The cover above already identifies the app; a constant icon here would say nothing.
        avatar={null}
        preview={
          <div className="relative size-full">
            <HostedApplicationCover application={app} />
            {coverBadge}
          </div>
        }
        topRight={
          menuItems?.length ? (
            <NavigationMore
              renderInRoot
              placement="bottom-end"
              hideOnClickInside
              contextId={titleId}
              onClick={(event) => event.stopPropagation()}
              items={menuItems}
            />
          ) : null
        }
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('a,button,[role="menu"]')) return
          // As for assistants: the card opens the details page; only Open launches the app.
          navigate(hostedRoutes.details(app.id))
        }}
        actions={
          !openable && isManager(app) ? (
            <Button
              size="small"
              variant="secondary"
              onClick={() => navigate(hostedRoutes.details(app.id))}
            >
              {nextStepLabel(app)}
            </Button>
          ) : (
            <OpenButtons app={app} openable={openable} noVersionId={noVersionId} onOpen={onOpen} />
          )
        }
        status={status}
      />
    </article>
  )
}

export default HostedApplicationCard
