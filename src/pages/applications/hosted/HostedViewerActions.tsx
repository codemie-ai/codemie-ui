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

import EditSvg from '@/assets/icons/edit.svg?react'
import RefreshSvg from '@/assets/icons/refresh.svg?react'
import ShareSvg from '@/assets/icons/share.svg?react'
import Button from '@/components/Button'
import NavigationMore from '@/components/NavigationMore/NavigationMore'
import type { NavigationMenuItem } from '@/components/NavigationMore/NavigationMore'
import type { HostedApplication } from '@/types/entity/hostedApplication'

import { hostedActions, isManager, type HostedActionKey } from './hostedAccess'
import { hostedRoutes } from './hostedRoutes'

interface Props {
  application: HostedApplication
  /** The overflow menu, from useHostedCardActions: one list for the card, header and viewer. */
  menuItems(app: HostedApplication, skip?: HostedActionKey[]): NavigationMenuItem[]
  onShare(): void
  onReload(): void
}
const HostedViewerActions = ({ application: app, menuItems, onShare, onReload }: Props) => (
  <div className="flex items-center gap-2">
    {hostedActions(app).some(({ key }) => key === 'share') && (
      <Button variant="secondary" size="small" onClick={onShare}>
        <ShareSvg className="size-4" />
        Share
      </Button>
    )}
    <NavigationMore
      renderInRoot
      placement="bottom-end"
      hideOnClickInside
      data-tooltip-content="Application actions"
      items={[
        { title: 'Reload', icon: <RefreshSvg />, onClick: onReload },
        ...menuItems(app, ['open', 'share']),
        {
          title: isManager(app) ? 'Manage application' : 'Application details',
          icon: <EditSvg />,
          href: hostedRoutes.details(app.id),
        },
      ]}
    />
  </div>
)
export default HostedViewerActions
