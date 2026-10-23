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
//

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import { usageAttributionStore } from '@/store/usageAttribution'
import { userStore } from '@/store/user'
import type { UaSettingsSchema, UaStoredOverrides, UaTier } from '@/types/usageAttribution'
import storage from '@/utils/storage'

import { UA_LINK_PARAM, UA_OVERRIDES_STORAGE_KEY } from '../constants'
import {
  OverridesMap,
  cleanOverrides,
  encodeOverrides,
  readSettingsLink,
  sanitizeOverrides,
  tierOf,
} from '../settings/settingsModel'

/** In-memory copy when the browser storage is unavailable: the overrides last until the page is closed. */
const memory: { userId: string | null; value: UaStoredOverrides | null } = {
  userId: null,
  value: null,
}

const storageWorks = (): boolean => {
  try {
    const probe = '__ua_storage_probe'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

const readStored = (userId: string): { value: UaStoredOverrides | null; available: boolean } => {
  if (!storageWorks())
    return { value: memory.userId === userId ? memory.value : null, available: false }
  try {
    const value = storage.getObject<UaStoredOverrides | null>(
      userId,
      UA_OVERRIDES_STORAGE_KEY,
      null
    )
    return {
      value: value && typeof value === 'object' && !Array.isArray(value) ? value : null,
      available: true,
    }
  } catch {
    // A corrupt stored value: start again from the defaults.
    storage.remove(userId, UA_OVERRIDES_STORAGE_KEY)
    return { value: null, available: true }
  }
}

const writeStored = (userId: string, value: UaStoredOverrides | null): boolean => {
  memory.userId = userId
  memory.value = value
  try {
    if (value) storage.put(userId, UA_OVERRIDES_STORAGE_KEY, value)
    else storage.remove(userId, UA_OVERRIDES_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

interface Restored {
  /** The overrides to apply now. */
  overrides: OverridesMap
  notices: string[]
  /** What to store again: undefined keeps the stored value, null removes it. */
  rewrite: UaStoredOverrides | null | undefined
}

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one)

/** Checks the stored overrides against the current schema: invalid or outdated values are dropped with a notice. */
export const restoreSaved = (
  schema: UaSettingsSchema,
  saved: UaStoredOverrides | null
): Restored => {
  if (!saved) return { overrides: {}, notices: [], rewrite: undefined }
  if (saved.schemaVersion !== schema.schema_version) {
    return {
      overrides: {},
      notices: [
        'Your saved analysis settings were made for an older version of this tab and were cleared.',
      ],
      rewrite: null,
    }
  }
  const { overrides, dropped } = sanitizeOverrides(schema, saved.overrides)
  const count = Object.keys(overrides).length
  const defaultsChanged = saved.defaultsHash !== schema.defaults_hash
  const notices: string[] = []
  if (dropped) {
    notices.push(
      `${dropped} saved ${plural(
        dropped,
        'setting is',
        'settings are'
      )} no longer valid and ${plural(dropped, 'was', 'were')} dropped.`
    )
  }
  if (defaultsChanged && count) {
    notices.push(
      'The defaults changed since you saved your settings; review them in Analysis Settings.'
    )
  }
  if (!schema.can_tune && count) {
    notices.push(
      'Your saved analysis settings are not applied: only admins and maintainers can change them.'
    )
  }
  let rewrite: UaStoredOverrides | null | undefined
  if (dropped || defaultsChanged) {
    rewrite = count
      ? {
          ...saved,
          overrides,
          defaultsHash: schema.defaults_hash,
          updatedAt: new Date().toISOString(),
        }
      : null
  }
  // An auditor cannot send overrides: theirs are kept but not applied.
  return { overrides: schema.can_tune ? overrides : {}, notices, rewrite }
}

export interface LinkDraft {
  overrides: OverridesMap
  dropped: number
}

export interface SettingsOverridesState {
  ready: boolean
  applied: OverridesMap
  count: number
  tier: UaTier | null
  notice: string
  storageAvailable: boolean
  linkDraft: LinkDraft | null
  apply: (draft: OverridesMap) => void
  dismissNotice: () => void
  clearLink: () => void
}

/**
 * The analysis settings overrides of the current user: kept in this browser (local storage), validated against the
 * schema of GET /settings, and sent with every request of the tab. Nothing is stored on the server.
 */
export const useSettingsOverrides = (
  schema: UaSettingsSchema | null,
  schemaFailed: boolean
): SettingsOverridesState => {
  const { user } = useSnapshot(userStore)
  const userId = user?.userId ?? null
  const [ready, setReady] = useState(false)
  const [applied, setApplied] = useState<OverridesMap>({})
  const [notice, setNotice] = useState('')
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [linkDraft, setLinkDraft] = useState<LinkDraft | null>(null)
  // A shared link (#ua=…) is read at the first render: the Analytics filters sync rewrites the URL without its
  // #fragment in the page's effects, before GET /settings returns. Used once the schema is there; Apply or Cancel
  // consumes it.
  const [sharedLink, setSharedLink] = useState<unknown>(() =>
    readSettingsLink(window.location.hash, UA_LINK_PARAM)
  )

  const publish = useCallback((map: OverridesMap) => {
    setApplied(map)
    usageAttributionStore.setOverrides(map, encodeOverrides(map))
  }, [])

  useEffect(() => {
    if (schemaFailed && !schema) {
      // Without the schema the stored values cannot be checked: the tab uses the defaults.
      publish({})
      setReady(true)
      return
    }
    if (!schema || !userId) return
    const { value: saved, available } = readStored(userId)
    setStorageAvailable(available)
    const restored = restoreSaved(schema, saved)
    if (restored.rewrite !== undefined) writeStored(userId, restored.rewrite)
    publish(restored.overrides)
    setNotice(restored.notices.join(' '))
    setReady(true)
  }, [schema, schemaFailed, userId, publish])

  // A link opened in this tab once the page is loaded changes only the #fragment, without a reload: read it again.
  useEffect(() => {
    const onHashChange = () => {
      const link = readSettingsLink(window.location.hash, UA_LINK_PARAM)
      if (link !== null) setSharedLink(link)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (schema && sharedLink) setLinkDraft(sanitizeOverrides(schema, sharedLink))
  }, [schema, sharedLink])

  const apply = useCallback(
    (draft: OverridesMap) => {
      if (!schema) return
      const clean = cleanOverrides(schema, draft)
      if (userId) {
        const stored = Object.keys(clean).length
          ? {
              schemaVersion: schema.schema_version,
              defaultsHash: schema.defaults_hash,
              overrides: clean,
              updatedAt: new Date().toISOString(),
            }
          : null
        setStorageAvailable(writeStored(userId, stored))
      }
      publish(clean)
    },
    [schema, userId, publish]
  )

  const clearLink = useCallback(() => {
    setLinkDraft(null)
    setSharedLink(null)
    if (
      readSettingsLink(window.location.hash, UA_LINK_PARAM) !== null ||
      window.location.hash.includes(`${UA_LINK_PARAM}=`)
    ) {
      const url = `${window.location.pathname}${window.location.search}`
      window.history.replaceState(window.history.state, '', url)
    }
  }, [])

  const keys = Object.keys(applied)
  const tier = useMemo(() => (schema ? tierOf(schema, keys) : null), [schema, keys.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ready,
    applied,
    count: keys.length,
    tier,
    notice,
    storageAvailable,
    linkDraft,
    apply,
    dismissNotice: () => setNotice(''),
    clearLink,
  }
}
