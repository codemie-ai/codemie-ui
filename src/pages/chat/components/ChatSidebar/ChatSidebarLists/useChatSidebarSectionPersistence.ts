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

import { useEffect, useRef } from 'react'
import { useSnapshot } from 'valtio'

import { userStore } from '@/store/user'
import storage from '@/utils/storage'

const SIDEBAR_SECTIONS_KEY = 'chat-sidebar-sections'

// Recent Chats and Folders are not persisted: they are mutually exclusive, and default to
// Folders open.
interface PersistedSidebarSections {
  pinnedExpanded: boolean
  recentAssistantsExpanded: boolean
}

const DEFAULTS: PersistedSidebarSections = {
  pinnedExpanded: true,
  recentAssistantsExpanded: true,
}

// Guarded on userId the same way pinOrderStore/moveOrderStore are: userStore.loadUser() resolves
// asynchronously (see useInitialDataFetch.tsx), so a sidebar mounted before it settles must not
// read or write the shared anonymous ('') bucket — that would mix one user's prefs with another's
// on a shared machine, with no later re-sync in the same session.
export const getPersistedSidebarSections = (): PersistedSidebarSections => {
  const userId = userStore.user?.userId
  if (!userId) return { ...DEFAULTS }
  return {
    // Spread over DEFAULTS rather than trusting the stored value's shape: the shared unit-test
    // stub for storage.getObject ignores its defaultValue argument and always returns [], whose
    // spread is a no-op, so this keeps every unrelated test's assumed defaults intact.
    ...DEFAULTS,
    ...storage.getObject(userId, SIDEBAR_SECTIONS_KEY, DEFAULTS),
  }
}

export const setPersistedSidebarSection = (patch: Partial<PersistedSidebarSections>): void => {
  const userId = userStore.user?.userId
  if (!userId) return
  storage.put(userId, SIDEBAR_SECTIONS_KEY, {
    ...getPersistedSidebarSections(),
    ...patch,
  })
}

/**
 * Consumers read getPersistedSidebarSections() once via a lazy useState initializer at mount,
 * which can run before userId is known. Call this alongside that state with a callback that
 * re-reads the persisted value and re-applies it — it fires once per session, exactly when
 * userStore.user?.userId first becomes truthy, correcting state that was initialized against the
 * (now guarded) anonymous default.
 */
export const useResyncPersistedSidebarSections = (onHydrate: () => void): void => {
  const { user } = useSnapshot(userStore)
  const userId = user?.userId
  const hasHydratedRef = useRef(Boolean(userId))
  useEffect(() => {
    if (userId && !hasHydratedRef.current) {
      hasHydratedRef.current = true
      onHydrate()
    }
  }, [userId, onHydrate])
}
