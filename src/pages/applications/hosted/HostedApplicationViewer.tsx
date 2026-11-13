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

import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'

import ApplicationsIcon from '@/assets/icons/applications.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout'
import Spinner from '@/components/Spinner'
import {
  type HostedLaunch,
  type HostedLaunchAt,
  hostedApplicationsStore as store,
  hostedAuthenticationGeneration,
  hostedErrorMessage,
} from '@/store/hostedApplications'
import type { HostedApplication } from '@/types/entity/hostedApplication'
import { createHostedFrame, type HostedFrame } from '@/utils/hostedApplicationFrame'
import {
  HOSTED_UUID,
  submitHostedLaunch,
  type ValidatedHostedLaunch,
} from '@/utils/hostedApplicationLaunch'
import { HOSTED_MESSAGE } from '@/utils/hostedApplicationMessages'
import {
  createHostedWindowOpener,
  HOSTED_OPENER_PARAM,
  HOSTED_PATH_PARAM,
  HOSTED_VERSION_PARAM,
  isHostedChannel,
  isHostedPath,
  openedByCodeMie,
} from '@/utils/hostedApplicationWindows'

import { canOpen, isManager, isSuspended } from './hostedAccess'
import { hostedRoutes } from './hostedRoutes'
import HostedViewerActions from './HostedViewerActions'
import { useHostedCardActions } from './useHostedCardActions'
import { hostedApplicationsOff, useHostedFeatureRedirect } from './useHostedFeatureRedirect'

// The content host is busy (429/503) or the embedded session could not start.
const BUSY_MESSAGE = 'The application is busy or unavailable right now. Retry in a few seconds.'

// The launch was refused because the version no longer passes its checks (for example its stored
// files are gone or the security policy changed); retrying cannot help, another version can.
const STALE_VERSION = 'VERSION_NOT_ACCEPTED'

// The backend refused the launch request, for example a page it does not serve.
const INVALID_LAUNCH = 'INVALID_LAUNCH'

const errorCode = (cause: unknown) =>
  (cause as { parsedError?: { details?: { code?: unknown } } } | null)?.parsedError?.details?.code

/** What the person can do when the application cannot be shown: managers upload, others go back. */
const unavailableCopy = (
  app: HostedApplication | null,
  error: string | null,
  stale: boolean,
  replaced: boolean
) => {
  if (replaced)
    return {
      title: 'This version is no longer available',
      message: 'A newer version of the application was published after this window opened.',
    }
  if (stale)
    return {
      title: 'This version is no longer available',
      message:
        app && isManager(app)
          ? 'Upload a new version or activate another one to open the application.'
          : 'Its publisher needs to activate another version.',
    }
  if (error) return { title: 'Unable to open application', message: error }
  if (app && !canOpen(app))
    return {
      title: 'No active version yet',
      message: isManager(app)
        ? 'Upload a version and activate it to open the application.'
        : 'Its publisher has not activated a version yet.',
    }
  return {
    title: 'This application is not available',
    message: 'Its publisher may have unpublished it or changed who can open it.',
  }
}

/** A manager is told the active version, so a window pinned to an earlier one need not launch. */
const pinReplaced = (app: HostedApplication, pinned: string | null | undefined) =>
  !!pinned && !!app.active_version_id && app.active_version_id !== pinned

/** Others are not told it: a pinned launch of an application they can open is then not found. */
const pinNotFound = (
  status: number | undefined,
  app: HostedApplication | null,
  pinned: string | null | undefined
) => status === 404 && !!app && !!pinned

/** Managers see which version they are looking at; everyone else sees who published it. */
const viewerSubtitle = (app: HostedApplication, versionId?: string) => {
  if (isSuspended(app)) return 'Suspended'
  if (!isManager(app))
    return 'Published by ' + app.publisher.display_name + ' · content provided by its publisher'
  return versionId
    ? 'Previewing a version · people with access see the active version'
    : 'Your application'
}

interface Props {
  id: string
  versionId?: string
  /** The `?path=` the viewer was opened with; one with the wrong shape launches the root. */
  path: string | null
  /** The `?version=` a published view was opened with, by a window this application opened. */
  version: string | null
  /** The `?opener=` channel of the window that opened this one; a malformed one is dropped. */
  opener: string | null
}
const ApplicationView = ({ id, versionId, path, version, opener }: Props) => {
  const navigate = useNavigate()
  useHostedFeatureRedirect()
  const [application, setApplication] = useState<HostedApplication | null>(null)
  const [frame, setFrame] = useState<HostedFrame | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  // A window pinned to the version its opener ran, after another version was published.
  const [replaced, setReplaced] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [unavailable, setUnavailable] = useState(false)
  const iframe = useRef<HTMLIFrameElement>(null)
  const pending = useRef<{ launch: ValidatedHostedLaunch; epoch: number } | null>(null)
  const active = useRef(false)
  // Where the application starts, read once per mount: Retry and Reload keep it. A router navigation
  // remounts the viewer (it is keyed on the location) and launches again, so a later change that lets
  // the address follow the application must use history.replaceState, never navigate.
  const launchAt = useRef<HostedLaunchAt>({
    path: isHostedPath(path) ? path : null,
    publishedVersion: !versionId && version && HOSTED_UUID.test(version) ? version : null,
  })
  // The channel of the window that opened this one, read once like the start page. It reaches the
  // content in its frame's name, never the launch.
  const openerChannel = useRef(isHostedChannel(opener) ? opener : null)
  useEffect(() => {
    let alive = true
    active.current = true
    const controller = new AbortController()
    let created: HostedFrame | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let openWindow: ((data: unknown) => void) | null = null
    const epoch = hostedAuthenticationGeneration()
    const current = () => alive && epoch === hostedAuthenticationGeneration()
    setFrame(null)
    setError(null)
    setStale(false)
    setReplaced(false)
    setUnavailable(false)
    setLoading(true)
    const handleMessage = (event: MessageEvent) => {
      if (
        !current() ||
        event.source !== iframe.current?.contentWindow ||
        event.origin !== window.location.origin
      )
        return
      if (event.data?.type === HOSTED_MESSAGE.open || event.data?.type === HOSTED_MESSAGE.close) {
        openWindow?.(event.data)
        return
      }
      // A tab the person opened is never closed by an application, whatever the browser allows.
      if (event.data?.type === HOSTED_MESSAGE.closeSelf) {
        if (openedByCodeMie()) window.close()
        return
      }
      if (event.data?.type === HOSTED_MESSAGE.ready) {
        clearTimeout(timer)
        setLoading(false)
      }
      if (event.data?.type === HOSTED_MESSAGE.unavailable) {
        clearTimeout(timer)
        setLoading(false)
        setUnavailable(true)
        setError(BUSY_MESSAGE)
      }
    }
    window.addEventListener('message', handleMessage)
    // The backend alone decides which pages it serves: a page it refuses launches the root, once.
    const startLaunch = async (): Promise<HostedLaunch> => {
      try {
        return await store.issueLaunch(id, versionId, controller.signal, launchAt.current)
      } catch (cause) {
        if (!current() || !launchAt.current.path || errorCode(cause) !== INVALID_LAUNCH) throw cause
        launchAt.current = { ...launchAt.current, path: null }
        return store.issueLaunch(id, versionId, controller.signal, launchAt.current)
      }
    }
    let opened: HostedApplication | null = null
    const load = async () => {
      try {
        // Old addresses (/apps/explore, /apps/trash, /apps/folders/...) land here: not available.
        if (!HOSTED_UUID.test(id) || (versionId && !HOSTED_UUID.test(versionId))) {
          setLoading(false)
          setUnavailable(true)
          return
        }
        // Custom applications are off: the spinner stays while the redirect to Platform apps takes over.
        if (await hostedApplicationsOff()) return
        const app = await store.getApplication(id, controller.signal)
        if (!current()) return
        setApplication(app)
        opened = app
        if (!canOpen(app) && !versionId) {
          setLoading(false)
          setUnavailable(true)
          return
        }
        // Never switch a pinned window to another version silently: the person chooses to.
        if (pinReplaced(app, launchAt.current.publishedVersion)) {
          setLoading(false)
          setUnavailable(true)
          setReplaced(true)
          return
        }
        const launch = await startLaunch()
        if (!current()) return
        // A new window runs the version this viewer runs, so the two can sync through storage.
        openWindow = createHostedWindowOpener(
          id,
          versionId ? hostedRoutes.preview(id, versionId) : hostedRoutes.view(id),
          versionId ? null : launch.versionId ?? null
        )
        created = createHostedFrame(launch, window.location.origin, openerChannel.current)
        pending.current = { launch, epoch }
        setFrame(created)
        timer = setTimeout(() => {
          if (!current()) return
          setLoading(false)
          setUnavailable(true)
          setError(BUSY_MESSAGE)
        }, 15000)
      } catch (cause) {
        if (!current()) return
        setLoading(false)
        setUnavailable(true)
        // Missing and forbidden look the same: the generic "not available" copy, no detail.
        const status = (cause as { status?: number } | null)?.status
        setStale(errorCode(cause) === STALE_VERSION)
        // Only managers are told the active version; for others the pinned launch is not found.
        setReplaced(pinNotFound(status, opened, launchAt.current.publishedVersion))
        setError(status === 404 || status === 403 ? null : hostedErrorMessage(cause))
      }
    }
    load()
    return () => {
      alive = false
      active.current = false
      controller.abort()
      clearTimeout(timer)
      window.removeEventListener('message', handleMessage)
      pending.current = null
    }
  }, [id, versionId, retry])
  const handleContainerLoad = () => {
    const ticket = pending.current
    if (!active.current || !ticket || !frame || ticket.epoch !== hostedAuthenticationGeneration())
      return
    // Only the fixed trusted container is inspected, never the uploaded document.
    if (iframe.current?.contentDocument?.querySelector('iframe')?.name !== frame.target) return
    pending.current = null
    submitHostedLaunch(ticket.launch, frame.target)
  }
  const subtitle = application ? viewerSubtitle(application, versionId) : 'Opening application'
  const copy = unavailableCopy(application, error, stale, replaced)
  const manages = !!application && isManager(application)
  const actions = useHostedCardActions({
    isCurrent: () => active.current,
    onChanged: async () => {
      try {
        const latest = await store.getApplication(id)
        if (active.current) setApplication(latest)
      } catch (cause) {
        if (active.current) setActionError(hostedErrorMessage(cause))
      }
    },
    onDeleted: () => {
      navigate(hostedRoutes.root)
    },
    onError: setActionError,
  })
  // Keeps the page but drops `?opener=`: content origins are per version, so the window that opened
  // this one runs the earlier version and the two could not talk anyway.
  const openCurrentVersion = () => {
    const query = new URLSearchParams()
    if (launchAt.current.path) query.set(HOSTED_PATH_PARAM, launchAt.current.path)
    const search = query.toString()
    navigate(hostedRoutes.view(id) + (search ? '?' + search : ''), { replace: true })
  }
  const back = () => {
    if ((window.history.state as { idx?: number } | null)?.idx) navigate(-1)
    else navigate(hostedRoutes.root)
  }
  return (
    <>
      <PageLayout
        title={application?.name ?? 'Application'}
        subtitle={subtitle}
        showBack
        onBack={back}
        childrenClassName="px-0 overflow-hidden"
        rightContent={
          application && (
            <HostedViewerActions
              application={application}
              menuItems={actions.menuItems}
              onShare={() => actions.select('share', application)}
              onReload={() => setRetry((value) => value + 1)}
            />
          )
        }
      >
        <div className="relative h-full min-h-0 bg-surface-base-secondary">
          {actionError && (
            <p
              role="alert"
              className="absolute inset-x-0 top-0 z-10 bg-failed-tertiary p-2 text-sm text-failed-secondary"
            >
              {actionError}
            </p>
          )}
          {frame && (
            <iframe
              ref={iframe}
              srcDoc={frame.document}
              title={application?.name ?? 'Application preview'}
              sandbox="allow-scripts allow-same-origin allow-popups"
              allow="fullscreen"
              referrerPolicy="no-referrer"
              className="size-full border-0"
              onLoad={handleContainerLoad}
            />
          )}
          {loading && (
            <div className="absolute inset-0 bg-surface-base-primary flex flex-col items-center justify-center gap-3">
              <Spinner />
              <p className="text-sm text-text-secondary">Opening application…</p>
            </div>
          )}
          {unavailable && (
            <div className="absolute inset-0 bg-surface-base-primary flex flex-col items-center justify-center text-center gap-4 p-6">
              <ApplicationsIcon className="size-10 text-icon-secondary" />
              <h2 className="text-lg font-semibold">{copy.title}</h2>
              <p
                role={error ? 'alert' : undefined}
                className="text-sm text-text-secondary max-w-lg break-words"
              >
                {copy.message}
              </p>
              {replaced && <Button onClick={openCurrentVersion}>Open the current version</Button>}
              {!stale && !replaced && (
                <Button variant="secondary" onClick={() => setRetry((value) => value + 1)}>
                  Retry
                </Button>
              )}
              <Link
                to={manages ? hostedRoutes.details(id) : hostedRoutes.root}
                className="text-text-accent underline"
              >
                {manages ? 'Manage application' : 'Return to Applications'}
              </Link>
            </div>
          )}
        </div>
      </PageLayout>
      {actions.dialogs}
    </>
  )
}
const HostedApplicationViewer = () => {
  const { id = '', versionId } = useParams()
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  return (
    <ApplicationView
      key={location.key + ':' + hostedAuthenticationGeneration()}
      id={id}
      versionId={versionId}
      path={query.get(HOSTED_PATH_PARAM)}
      version={query.get(HOSTED_VERSION_PARAM)}
      opener={query.get(HOSTED_OPENER_PARAM)}
    />
  )
}
export default HostedApplicationViewer
