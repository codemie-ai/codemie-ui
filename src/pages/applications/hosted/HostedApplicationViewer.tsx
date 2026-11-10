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
  hostedApplicationsStore as store,
  hostedAuthenticationGeneration,
  hostedErrorMessage,
} from '@/store/hostedApplications'
import type { HostedApplication } from '@/types/entity/hostedApplication'
import { createHostedFrame, type HostedFrame } from '@/utils/hostedApplicationFrame'
import {
  HOSTED_UUID,
  openHostedLaunchWindow,
  submitHostedLaunch,
  type ValidatedHostedLaunch,
} from '@/utils/hostedApplicationLaunch'

import { canOpen, isManager, isSuspended } from './hostedAccess'
import { hostedRoutes } from './hostedRoutes'
import HostedViewerActions from './HostedViewerActions'
import { useHostedCardActions } from './useHostedCardActions'
import { hostedApplicationsOff, useHostedFeatureRedirect } from './useHostedFeatureRedirect'

// The content host is busy (429/503) or the embedded session could not start.
const BUSY_MESSAGE =
  'The application is busy or unavailable right now. Retry in a few seconds, or open it in a new tab.'

// The launch was refused because the version no longer passes its checks (for example its stored
// files are gone or the security policy changed); retrying cannot help, another version can.
const STALE_VERSION = 'VERSION_NOT_ACCEPTED'

const errorCode = (cause: unknown) =>
  (cause as { parsedError?: { details?: { code?: unknown } } } | null)?.parsedError?.details?.code

/** What the person can do when the application cannot be shown: managers upload, others go back. */
const unavailableCopy = (app: HostedApplication | null, error: string | null, stale: boolean) => {
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
}
const ApplicationView = ({ id, versionId }: Props) => {
  const navigate = useNavigate()
  useHostedFeatureRedirect()
  const [application, setApplication] = useState<HostedApplication | null>(null)
  const [frame, setFrame] = useState<HostedFrame | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [unavailable, setUnavailable] = useState(false)
  const iframe = useRef<HTMLIFrameElement>(null)
  const pending = useRef<{ launch: ValidatedHostedLaunch; epoch: number } | null>(null)
  const active = useRef(false)
  const visit = useRef(0)
  const selected = useRef<string | undefined>(versionId)
  useEffect(() => {
    let alive = true
    active.current = true
    visit.current += 1
    const controller = new AbortController()
    let created: HostedFrame | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    const epoch = hostedAuthenticationGeneration()
    const current = () => alive && epoch === hostedAuthenticationGeneration()
    setFrame(null)
    setError(null)
    setStale(false)
    setUnavailable(false)
    setLoading(true)
    const handleMessage = (event: MessageEvent) => {
      if (
        !current() ||
        event.source !== iframe.current?.contentWindow ||
        event.origin !== window.location.origin
      )
        return
      if (event.data?.type === 'codemie-hosted-ready') {
        clearTimeout(timer)
        setLoading(false)
      }
      if (event.data?.type === 'codemie-hosted-unavailable') {
        clearTimeout(timer)
        setLoading(false)
        setUnavailable(true)
        setError(BUSY_MESSAGE)
      }
    }
    window.addEventListener('message', handleMessage)
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
        selected.current = versionId
        if (!canOpen(app) && !versionId) {
          setLoading(false)
          setUnavailable(true)
          return
        }
        const launch = await store.issueLaunch(id, selected.current, controller.signal)
        if (!current()) return
        created = createHostedFrame(launch, window.location.origin)
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
  const openSeparately = async () => {
    const epoch = hostedAuthenticationGeneration()
    const requestVisit = visit.current
    // Reserve the tab while the click still counts as a user gesture; the ticket is posted into it.
    const target = openHostedLaunchWindow()
    try {
      const launch = await store.issueLaunch(id, selected.current)
      if (
        active.current &&
        requestVisit === visit.current &&
        epoch === hostedAuthenticationGeneration()
      )
        submitHostedLaunch(launch, target?.name ?? '_self')
      else target?.window.close()
    } catch (cause) {
      target?.window.close()
      if (
        active.current &&
        requestVisit === visit.current &&
        epoch === hostedAuthenticationGeneration()
      )
        setError(hostedErrorMessage(cause))
    }
  }
  const subtitle = application ? viewerSubtitle(application, versionId) : 'Opening application'
  const copy = unavailableCopy(application, error, stale)
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
              onOpenSeparately={openSeparately}
              previewing={!!versionId}
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
              sandbox="allow-scripts allow-same-origin"
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
              {!stale && (
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
  return (
    <ApplicationView
      key={location.key + ':' + hostedAuthenticationGeneration()}
      id={id}
      versionId={versionId}
    />
  )
}
export default HostedApplicationViewer
