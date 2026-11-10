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

import type { SharableUser, SharedWithUser } from '@/types/entity/sharing'
import api from '@/utils/api'

/**
 * The named-sharing endpoints every shareable entity exposes under its resource path:
 * `GET {id}/shared-with`, `POST|DELETE {id}/share`, `GET {id}/sharable-users?q=`.
 */
export interface SharingClient {
  loadSharedWith(id: string): Promise<SharedWithUser[]>
  searchUsers(id: string, query: string, signal?: AbortSignal): Promise<SharableUser[]>
  share(id: string, userIds: string[]): Promise<void>
  unshare(id: string, userIds: string[]): Promise<void>
}

export interface SharingClientOptions {
  /**
   * Runs around every request, so a store can add its own checks — for example dropping
   * a response that arrives after another user signed in.
   */
  guard?: <T>(run: () => Promise<T>) => Promise<T>
}

const passThrough = <T>(run: () => Promise<T>) => run()

// The backend wraps lists as { shared_with: [...] } and { users: [...] }; tolerate a flat array.
const unwrap = <T>(data: unknown, key: string): T[] => {
  if (Array.isArray(data)) return data as T[]
  const list = (data as Record<string, unknown> | null)?.[key]
  return Array.isArray(list) ? (list as T[]) : []
}

/**
 * @param basePath the entity's resource path (`v1/assistants`), or a function that returns one
 *   item's path and may throw to refuse an invalid id.
 */
export const createSharingClient = (
  basePath: string | ((id: string) => string),
  { guard = passThrough }: SharingClientOptions = {}
): SharingClient => {
  const itemPath = typeof basePath === 'string' ? (id: string) => `${basePath}/${id}` : basePath
  const path = (id: string, suffix: string) => `${itemPath(id)}/${suffix}`

  return {
    loadSharedWith: (id) =>
      guard(async () => {
        const response = await api.get(path(id, 'shared-with'), { skipErrorHandling: true })
        return unwrap<SharedWithUser>(await response.json(), 'shared_with')
      }),

    searchUsers: (id, query, signal) =>
      guard(async () => {
        const response = await api.get(path(id, 'sharable-users'), {
          params: { q: query },
          signal,
          skipErrorHandling: true,
        })
        return unwrap<SharableUser>(await response.json(), 'users')
      }),

    share: (id, userIds) =>
      guard(async () => {
        await api.post(path(id, 'share'), { user_ids: userIds }, { skipErrorHandling: true })
      }),

    unshare: (id, userIds) =>
      guard(async () => {
        await api.delete(path(id, 'share'), { user_ids: userIds }, { skipErrorHandling: true })
      }),
  }
}

/** The callbacks the share popup takes, for one item. */
export interface BoundSharing {
  loadSharedWith(): Promise<SharedWithUser[]>
  searchUsers(query: string): Promise<SharableUser[]>
  share(userIds: string[]): Promise<void>
  unshare(userIds: string[]): Promise<void>
}

/**
 * Binds a sharing client to one item for the share popup. The current user is left out of
 * both the search results and the people with access: nobody shares an item with themselves.
 */
export const bindSharing = (
  client: SharingClient,
  id: string,
  currentUserId: string | undefined
): BoundSharing => {
  const withoutCurrentUser = <T extends { id: string }>(users: T[]) =>
    currentUserId ? users.filter((user) => user.id !== currentUserId) : users

  return {
    loadSharedWith: async () => withoutCurrentUser(await client.loadSharedWith(id)),
    searchUsers: async (query) => withoutCurrentUser(await client.searchUsers(id, query)),
    share: (userIds) => client.share(id, userIds),
    unshare: (userIds) => client.unshare(id, userIds),
  }
}
