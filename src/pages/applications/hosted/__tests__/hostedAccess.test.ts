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

import { describe, expect, it } from 'vitest'

import type { HostedApplication } from '@/types/entity/hostedApplication'

import {
  canModerate,
  canOpen,
  canRemove,
  canShare,
  hostedActions,
  isCreator,
  isManager,
  suspensionRefuses,
} from '../hostedAccess'

const make = (over: Partial<HostedApplication> = {}): HostedApplication =>
  ({
    id: 'a1',
    name: 'App',
    description: '',
    artifact_kind: 'html',
    publisher: { display_name: 'P' },
    updated_at: '',
    capabilities: { can_launch: true, can_manage: false },
    user_abilities: [],
    ...over,
  } as HostedApplication)

const keys = (app: HostedApplication) => hostedActions(app).map((a) => a.key)
const find = (app: HostedApplication, key: string) => hostedActions(app).find((a) => a.key === key)

describe('hostedAccess predicates', () => {
  it('isManager follows write and canRemove follows delete', () => {
    expect(isManager(make({ user_abilities: ['write'] }))).toBe(true)
    expect(isManager(make({ user_abilities: ['read', 'delete'] }))).toBe(false)
    expect(canRemove(make({ user_abilities: ['delete'] }))).toBe(true)
    expect(canRemove(make({ user_abilities: ['write'] }))).toBe(false)
  })

  it('canShare, canModerate and canOpen follow their fields', () => {
    expect(canShare(make({ can_share: true }))).toBe(true)
    expect(canShare(make())).toBe(false)
    expect(canModerate(make({ can_moderate: true }))).toBe(true)
    expect(canModerate(make())).toBe(false)
    expect(canOpen(make({ has_active_version: true }))).toBe(true)
    expect(canOpen(make())).toBe(false)
  })

  it('isCreator is true only for created_by.id, not for an admin with write', () => {
    const app = make({ created_by: { id: 'u1' }, user_abilities: ['write'] })
    expect(isCreator(app, 'u1')).toBe(true)
    expect(isCreator(app, 'admin')).toBe(false)
    expect(isCreator(app, undefined)).toBe(false)
  })

  it('suspensionRefuses follows the server-reported suspension_refuses list', () => {
    const refusing = make({ suspended: true, suspension_refuses: ['activate', 'publish'] })
    expect(suspensionRefuses(refusing, 'activate')).toBe(true)
    expect(suspensionRefuses(refusing, 'publish')).toBe(true)
    // Only what the server lists is refused; the UI keeps no list of its own.
    expect(suspensionRefuses(refusing, 'move')).toBe(false)
    expect(suspensionRefuses(refusing, 'share_on')).toBe(false)
    for (const a of ['activate', 'publish', 'share_on', 'move'] as const) {
      expect(suspensionRefuses(make({ suspended: true }), a)).toBe(false)
      expect(suspensionRefuses(make({ suspension_refuses: [] }), a)).toBe(false)
    }
  })
})

describe('hostedActions', () => {
  it('offers no edit, upload or publish without write, and no delete without delete', () => {
    const k = keys(make({ user_abilities: ['read'], has_active_version: true }))
    expect(k).toEqual(['open'])
  })

  it('offers all owner actions in order with write and delete', () => {
    const k = keys(
      make({ user_abilities: ['write', 'delete'], can_share: true, has_active_version: true })
    )
    expect(k).toEqual(['open', 'edit', 'upload', 'publish', 'share', 'delete'])
  })

  it('shows share only with can_share', () => {
    expect(keys(make({ user_abilities: ['write'] }))).not.toContain('share')
    expect(keys(make({ can_share: true }))).toContain('share')
  })

  it('shows suspend or reinstate only with can_moderate', () => {
    expect(keys(make())).not.toContain('suspend')
    expect(keys(make({ can_moderate: true }))).toContain('suspend')
    const k = keys(make({ can_moderate: true, suspended: true }))
    expect(k).toContain('reinstate')
    expect(k).not.toContain('suspend')
  })

  it('offers Revoke share link to a moderator who is not the owner', () => {
    expect(keys(make({ can_moderate: true }))).toEqual(['open', 'suspend', 'revoke_link'])
    expect(find(make({ can_moderate: true }), 'revoke_link')?.label).toBe('Revoke share link')
    // Suspended apps keep it: revoking is allowed while suspended.
    expect(keys(make({ can_moderate: true, suspended: true }))).toContain('revoke_link')
    // The owner revokes from the Share popup instead.
    expect(keys(make({ can_moderate: true, can_share: true }))).not.toContain('revoke_link')
    expect(keys(make({ user_abilities: ['write', 'delete'] }))).not.toContain('revoke_link')
  })

  it('disables publish while suspended but keeps Remove from Marketplace enabled', () => {
    const pub = find(
      make({ user_abilities: ['write'], suspended: true, suspension_refuses: ['publish'] }),
      'publish'
    )
    expect(pub?.label).toBe('Publish to Marketplace')
    expect(pub?.disabled).toBe(true)
    const un = find(
      make({ user_abilities: ['write'], suspended: true, is_global: true }),
      'unpublish'
    )
    expect(un?.label).toBe('Remove from Marketplace')
    expect(un?.disabled).toBeFalsy()
  })

  it('disables open when there is no active version', () => {
    expect(find(make(), 'open')?.disabled).toBe(true)
    expect(find(make({ has_active_version: true }), 'open')?.disabled).toBeFalsy()
  })
})
