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

import EditSvg from '@/assets/icons/edit.svg?react'
import EyeSvg from '@/assets/icons/eye.svg?react'
import OpenSvg from '@/assets/icons/open.svg?react'
import Button from '@/components/Button'
import NavigationMore from '@/components/NavigationMore/NavigationMore'
import type { NavigationMenuItem } from '@/components/NavigationMore/NavigationMore'
import type { HostedApplication } from '@/types/entity/hostedApplication'

import { hostedActions, type HostedActionKey } from './hostedAccess'
import { hostedRoutes } from './hostedRoutes'

interface Props {
  application: HostedApplication
  busy: boolean
  nameId: string
  /** The overflow menu, from useHostedCardActions: one list for the card, header and viewer. */
  menuItems(app: HostedApplication, skip?: HostedActionKey[]): NavigationMenuItem[]
  onOpen(): void
  onAction(key: HostedActionKey): void
}

// View, Open in new tab and Edit are buttons; Share, Upload new version and the rest stay in the overflow menu,
// and Versions has its own Upload version button.
const BUTTON_KEYS: HostedActionKey[] = ['open', 'edit']

const HostedDetailsActions = ({
  application: app,
  busy,
  nameId,
  menuItems,
  onOpen,
  onAction,
}: Props) => {
  const actions = hostedActions(app)
  const has = (key: HostedActionKey) => actions.find((action) => action.key === key)
  const open = has('open')
  const standalone = useHref(hostedRoutes.standalone(app.id))
  // "Copy share link" in the Share popup is the only copy action (AC10).
  const menu: NavigationMenuItem[] = menuItems(app, BUTTON_KEYS)
  return (
    <div className="flex flex-wrap items-center gap-2">
      {open && (
        <Button disabled={busy || open.disabled} onClick={onOpen}>
          <EyeSvg aria-hidden className="size-4" />
          View
        </Button>
      )}
      {open && (
        <Button
          variant="secondary"
          disabled={busy || open.disabled}
          onClick={() => window.open(standalone, '_blank', 'noopener')}
        >
          <OpenSvg aria-hidden className="size-4" />
          Open in new tab
        </Button>
      )}
      {has('edit') && (
        <Button variant="secondary" disabled={busy} onClick={() => onAction('edit')}>
          <EditSvg aria-hidden className="size-4" />
          Edit
        </Button>
      )}
      <NavigationMore hideOnClickInside placement="bottom-end" items={menu} contextId={nameId} />
    </div>
  )
}

export default HostedDetailsActions
