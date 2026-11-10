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

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import {
  hostedApplicationsStore as store,
  hostedErrorMessage,
  hostedAuthenticationGeneration,
} from '@/store/hostedApplications'
import type { HostedApplication, HostedVersion } from '@/types/entity/hostedApplication'
import { HOSTED_UUID } from '@/utils/hostedApplicationLaunch'

import { isManager } from './hostedAccess'
import { loadHostedDetails } from './hostedDetailsLoading'
import { hostedRoutes } from './hostedRoutes'
import { hostedApplicationsOff, useHostedFeatureRedirect } from './useHostedFeatureRedirect'

/** A response that started before a newer change (cover, details, sharing) must not undo it. */
const newer = (previous: HostedApplication | null, next: HostedApplication | null) =>
  previous && next && previous.id === next.id && (previous.revision ?? 0) > (next.revision ?? 0)
    ? previous
    : next

/** 3–4 s between polls; the jitter keeps open tabs from polling in step. */
const pollDelay = () => 3000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 1000)

/** The page's versions not already listed, appended in order. */
const appendUnseen = (listed: HostedVersion[], page: HostedVersion[]) => {
  const known = new Set(listed.map((version) => version.id))
  return [...listed, ...page.filter((version) => !known.has(version.id))]
}

export const useHostedApplicationDetails = () => {
  useHostedFeatureRedirect()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [latestApplication, setLatestApplication] = useState<HostedApplication | null>(null)
  const application = latestApplication
  const setApplication = useCallback(
    (next: HostedApplication | null) => setLatestApplication((previous) => newer(previous, next)),
    []
  )
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [resume, setResume] = useState<HostedVersion | null>(null)
  const [versions, setVersions] = useState<HostedVersion[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<HostedVersion | null>(null)
  const [confirmVersion, setConfirmVersion] = useState<{
    version: HostedVersion
    action: 'activate' | 'cancel'
  } | null>(null)

  const pendingLoad = useRef<AbortController | null>(null)
  const lastVersions = useRef(versions)
  lastVersions.current = versions
  const lastCursor = useRef(nextCursor)
  lastCursor.current = nextCursor
  const loadedMore = useRef(false)
  const busyRef = useRef(busy)
  busyRef.current = busy
  const requestGeneration = useRef(0)
  const mounted = useRef(false)
  const authentication = hostedAuthenticationGeneration()
  const visit = useRef({ id, authentication, generation: 0 })
  if (visit.current.id !== id || visit.current.authentication !== authentication)
    visit.current = { id, authentication, generation: visit.current.generation + 1 }
  const visitGeneration = visit.current.generation
  const currentId = useRef(id)
  currentId.current = id
  const isCurrent = useCallback(
    () =>
      mounted.current &&
      currentId.current === id &&
      visitGeneration === visit.current.generation &&
      authentication === hostedAuthenticationGeneration(),
    [id, authentication, visitGeneration]
  )
  const handleLoadError = useCallback(
    async (cause: unknown, current: () => boolean) => {
      if (!current() || (cause as Error)?.name === 'AbortError') return
      // Missing and forbidden look the same: nothing about the application is revealed.
      const status = (cause as { status?: number } | null)?.status
      if (status === 404 || status === 403) {
        setApplication(null)
        setNotAvailable(true)
        return
      }
      setError(hostedErrorMessage(cause))
    },
    [setApplication]
  )
  const load = useCallback(
    async (preservePages = false) => {
      pendingLoad.current?.abort()
      const controller = new AbortController()
      pendingLoad.current = controller
      requestGeneration.current += 1
      const generation = requestGeneration.current
      const current = () => generation === requestGeneration.current && isCurrent()
      if (!HOSTED_UUID.test(id)) {
        setError('Application unavailable.')
        setLoading(false)
        return
      }
      // Custom applications are off: the spinner stays while the redirect to Platform apps takes over.
      if (await hostedApplicationsOff()) return
      try {
        const { app, page, versions: loaded } = await loadHostedDetails(id, controller.signal)
        if (current()) {
          setApplication(app)
          setNotAvailable(false)
          if (!preservePages) setError(null)
          const retained = preservePages && loadedMore.current && isManager(app)
          setVersions(
            retained
              ? [
                  ...loaded,
                  ...lastVersions.current.filter(
                    (item) => !loaded.some((fresh) => fresh.id === item.id)
                  ),
                ]
              : loaded
          )
          setNextCursor(retained ? lastCursor.current : page.next_cursor)
          if (!retained) loadedMore.current = false
        }
      } catch (cause) {
        await handleLoadError(cause, current)
      } finally {
        if (current()) setLoading(false)
      }
    },
    [id, handleLoadError, isCurrent, setApplication]
  )
  useEffect(() => {
    mounted.current = true
    setBusy(false)
    setResume(null)
    setNextCursor(null)
    loadedMore.current = false
    setApplication(null)
    setVersions([])
    setReport(null)
    setConfirmVersion(null)
    setLoading(true)
    setError(null)
    setNotAvailable(false)
    store.ensureCapabilities()
    load()
    return () => {
      mounted.current = false
      requestGeneration.current += 1
      pendingLoad.current?.abort()
    }
  }, [load, setApplication])
  const processing = versions.some(
    (version) =>
      ['queued', 'validating'].includes(version.validation_state) ||
      ['ready', 'running'].includes(version.job?.state ?? '')
  )
  useEffect(() => {
    if (!processing) return () => undefined
    let alive = true
    let timer: ReturnType<typeof setTimeout>
    const tick = async () => {
      if (!alive) return
      if (document.visibilityState !== 'hidden' && navigator.onLine && !busyRef.current)
        await load(true)
      if (alive) timer = setTimeout(tick, pollDelay())
    }
    const visible = () => {
      if (document.visibilityState !== 'hidden') {
        clearTimeout(timer)
        tick()
      }
    }
    timer = setTimeout(tick, pollDelay())
    document.addEventListener('visibilitychange', visible)
    window.addEventListener('online', visible)
    return () => {
      alive = false
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', visible)
      window.removeEventListener('online', visible)
    }
  }, [processing, load])

  const loadMore = async () => {
    if (!nextCursor || busy) return
    busyRef.current = true
    setBusy(true)
    const generation = requestGeneration.current
    try {
      const page = await store.listVersionPage(id, nextCursor)
      if (isCurrent() && generation === requestGeneration.current) {
        setVersions((previous) => appendUnseen(previous, page.items))
        setNextCursor(page.next_cursor)
        loadedMore.current = true
      }
    } catch (cause) {
      if (isCurrent()) setError(hostedErrorMessage(cause))
    } finally {
      if (isCurrent()) {
        busyRef.current = false
        setBusy(false)
      }
    }
  }
  const open = (version?: HostedVersion) => {
    if (!application) return
    navigate(
      version ? hostedRoutes.preview(application.id, version.id) : hostedRoutes.view(application.id)
    )
  }
  const act = async (
    version: HostedVersion,
    action: 'select' | 'activate' | 'cancel' | 'retry'
  ) => {
    if (!application) return
    if ((action === 'activate' || action === 'cancel') && !confirmVersion) {
      setConfirmVersion({ version, action })
      return
    }
    setBusy(true)
    setError(null)
    try {
      await store.versionAction(application, version, action)
      if (!isCurrent()) return
      setConfirmVersion(null)
      await load()
    } catch (cause) {
      if (!isCurrent()) return
      setError(hostedErrorMessage(cause))
      setConfirmVersion(null)
      // A refused action (e.g. a stale If-Match) leaves an old etag: reload, keeping the error shown.
      await load(true)
    } finally {
      if (isCurrent()) setBusy(false)
    }
  }
  return {
    id,
    navigate,
    application,
    versions,
    nextCursor,
    loadMore,
    resume,
    setResume,
    error,
    loading,
    busy,
    report,
    setReport,
    confirmVersion,
    setConfirmVersion,
    load,
    open,
    act,
    setApplication,
    setError,
    notAvailable,
    isCurrent,
  }
}
