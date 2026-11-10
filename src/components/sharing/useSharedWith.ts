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

import { useEffect, useState } from 'react'

import type { SharedWithUser } from '@/types/entity/sharing'

import { bindSharing, type SharingClient } from './sharingClient'

export interface UseSharedWithOptions {
  /** Ask only when true, for example only for the item's owner. Defaults to true. */
  enabled?: boolean
  /** Left out of the list, by the same rule as the share popup (`bindSharing`). */
  currentUserId?: string
  /** Any change loads the list again, for example a reloaded item object. */
  reloadKey?: unknown
}

export interface SharedWith {
  /** The people with access; empty until loaded, while disabled and after a failure. */
  users: SharedWithUser[]
  /** A list for the current item is loaded (it stays on screen while a reload is in flight). */
  loaded: boolean
  /** The last load failed; offer `reload`. */
  failed: boolean
  reload(): void
}

/**
 * The "Shared with" list of one item for a details page, read through the entity's sharing
 * client. Both details pages and the share popup leave the current user out the same way.
 */
export const useSharedWith = (
  client: SharingClient,
  id: string | undefined,
  { enabled = true, currentUserId, reloadKey }: UseSharedWithOptions = {}
): SharedWith => {
  const [list, setList] = useState<{ id: string; users: SharedWithUser[] } | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const active = enabled && !!id

  useEffect(() => {
    setFailed(false)
    if (!active) {
      setList(null)
      return () => undefined
    }
    let alive = true
    bindSharing(client, id, currentUserId)
      .loadSharedWith()
      .then((users) => {
        if (alive) setList({ id, users })
      })
      .catch(() => {
        if (!alive) return
        setList(null)
        setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [client, id, active, currentUserId, reloadKey, attempt])

  const loaded = active && list?.id === id
  return {
    users: loaded ? list.users : [],
    loaded,
    failed: active && failed,
    reload: () => setAttempt((value) => value + 1),
  }
}
