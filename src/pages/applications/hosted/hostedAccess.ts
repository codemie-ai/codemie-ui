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

import type { HostedApplication, SuspensionRefused } from '@/types/entity/hostedApplication'
import { canDelete, canEdit, isOwner } from '@/utils/entity'

/** The only module that reads the hosted application access fields. */
export type { SuspensionRefused } from '@/types/entity/hostedApplication'

export const isManager = (app: HostedApplication) => canEdit(app)
export const canRemove = (app: HostedApplication) => canDelete(app)
export const canShare = (app: HostedApplication) => !!app.can_share
export const canModerate = (app: HostedApplication) => !!app.can_moderate
export const canOpen = (app: HostedApplication) => !!app.has_active_version
export const isSuspended = (app: HostedApplication) => !!app.suspended

/** What a suspension refuses comes from the server (`suspension_refuses`); empty unless suspended. */
export const suspensionRefuses = (app: HostedApplication, action: SuspensionRefused) =>
  app.suspension_refuses?.includes(action) ?? false

export const isCreator = (app: HostedApplication, userId?: string) =>
  isOwner({ created_by: app.created_by ?? undefined }, userId)

export type HostedActionKey =
  | 'open'
  | 'edit'
  | 'upload'
  | 'publish'
  | 'unpublish'
  | 'share'
  | 'delete'
  | 'suspend'
  | 'reinstate'
  | 'revoke_link'

export interface HostedAction {
  key: HostedActionKey
  label: string
  disabled?: boolean
}

export const hostedActions = (app: HostedApplication): HostedAction[] => {
  const actions: HostedAction[] = [{ key: 'open', label: 'View', disabled: !canOpen(app) }]

  if (isManager(app)) {
    actions.push({ key: 'edit', label: 'Edit' }, { key: 'upload', label: 'Upload new version' })
    actions.push(
      app.is_global
        ? { key: 'unpublish', label: 'Remove from Marketplace' }
        : {
            key: 'publish',
            label: 'Publish to Marketplace',
            disabled: suspensionRefuses(app, 'publish'),
          }
    )
  }
  if (canShare(app)) actions.push({ key: 'share', label: 'Share' })
  if (canRemove(app)) actions.push({ key: 'delete', label: 'Delete' })
  if (canModerate(app)) {
    actions.push(
      isSuspended(app)
        ? { key: 'reinstate', label: 'Reinstate' }
        : { key: 'suspend', label: 'Suspend' }
    )
    // A moderator who is not the owner stops a leaked link without reading it; the owner
    // revokes it from the Share popup.
    if (!canShare(app)) actions.push({ key: 'revoke_link', label: 'Revoke share link' })
  }
  return actions
}
