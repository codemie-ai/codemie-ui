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

import { useId } from 'react'
import { Link } from 'react-router'

import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout'
import { useSharedWith } from '@/components/sharing'
import Spinner from '@/components/Spinner'
import { hostedApplicationsStore as store } from '@/store/hostedApplications'
import { userStore } from '@/store/user'
import type { HostedApplication } from '@/types/entity/hostedApplication'
import { formatDateTime } from '@/utils/helpers'

import ApplicationsSidebar from '../ApplicationsSidebar'
import { hostedActions, isCreator, isManager, isSuspended } from './hostedAccess'
import HostedApplicationOverview from './HostedApplicationOverview'
import HostedDetailsActions from './HostedDetailsActions'
import HostedDetailsDialogs from './HostedDetailsDialogs'
import HostedNotAvailable from './HostedNotAvailable'
import { hostedRoutes } from './hostedRoutes'
import HostedVersionList from './HostedVersionList'
import { useHostedApplicationDetails } from './useHostedApplicationDetails'
import { useHostedCardActions } from './useHostedCardActions'

import type { HostedEditState } from './EditHostedApplicationPage'

// The edit page returns here, through history, after a save or a cancel.
const EDIT_FROM_DETAILS: HostedEditState = { from: 'details' }

const HostedDetailsNotices = ({ application }: { application: HostedApplication }) =>
  isSuspended(application) ? (
    <output className="block rounded-lg border border-failed-secondary bg-failed-tertiary p-4 text-sm text-failed-secondary">
      <strong>Suspended</strong>
      {' · unavailable until a moderator reinstates it.'}
    </output>
  ) : null

const HostedApplicationDetails = () => {
  const nameId = useId()
  const details = useHostedApplicationDetails()
  const { application, versions, error, loading, busy, navigate, isCurrent, setError } = details
  const { notAvailable } = details
  const currentUserId = userStore.user?.userId
  const creator = !!application && isCreator(application, currentUserId)
  // Only the creator reads who the application is shared with.
  const sharedWith = useSharedWith(store.sharing, application?.id, {
    enabled: creator,
    currentUserId,
  })
  const actions = useHostedCardActions({
    isCurrent,
    onChanged: () => {
      sharedWith.reload()
      return details.load(true)
    },
    onDeleted: () => {
      navigate(hostedRoutes.root)
    },
    onError: setError,
  })

  const manager = !!application && isManager(application)
  const back = () => {
    // Return to where the user came from (scope or search); deep links fall back to the catalog.
    if ((window.history.state as { idx?: number } | null)?.idx) navigate(-1)
    else navigate(hostedRoutes.collection(manager ? 'mine' : 'shared'))
  }

  return (
    <div className="flex h-full min-w-0">
      <ApplicationsSidebar />
      <PageLayout title="Application details" showBack onBack={back}>
        {loading && (
          <div className="flex justify-center py-24">
            <Spinner />
          </div>
        )}
        {!loading && notAvailable && <HostedNotAvailable />}
        {!loading && !application && !notAvailable && error && (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <h2 className="text-xl font-semibold">Application unavailable</h2>
            <p role="alert" className="max-w-md break-words text-sm text-text-tertiary">
              {error}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => details.load()}>
                Retry
              </Button>
              <Link
                to={hostedRoutes.root}
                className="self-center text-sm text-text-accent hover:underline"
              >
                Back to Applications
              </Link>
            </div>
          </div>
        )}
        {!loading && application && (
          <div className="mx-auto flex max-w-5xl flex-col py-8">
            <div className="flex flex-row justify-between gap-4 max-view-details-bp:flex-col">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <h1 id={nameId} className="break-words text-2xl font-bold text-text-primary">
                    {application.name}
                  </h1>
                  <p className="text-sm text-text-secondary">
                    {creator ? 'Created by you' : 'by ' + application.publisher.display_name}
                    {' · updated ' + formatDateTime(application.updated_at, 'relative')}
                  </p>
                </div>
              </div>
              <HostedDetailsActions
                application={application}
                busy={busy}
                nameId={nameId}
                onOpen={() => details.open()}
                menuItems={actions.menuItems}
                onAction={(key) =>
                  key === 'edit'
                    ? navigate(hostedRoutes.edit(application.id), { state: EDIT_FROM_DETAILS })
                    : actions.select(key, application)
                }
              />
            </div>
            {error && (
              <div
                role="alert"
                className="mt-6 flex flex-wrap items-center gap-2 rounded-lg border border-failed-secondary bg-failed-tertiary px-4 py-3 text-sm text-failed-secondary"
              >
                <span className="min-w-0 flex-1 break-words">{error}</span>
                <Button variant="tertiary" size="small" onClick={() => details.load()}>
                  Retry
                </Button>
              </div>
            )}
            <div className="mt-8 flex flex-row gap-9 max-view-details-bp:flex-col">
              <div className="flex min-w-0 grow flex-col gap-8 max-view-details-bp:order-2">
                <section aria-labelledby="hosted-about-heading">
                  <h2 id="hosted-about-heading" className="text-sm font-bold">
                    About
                  </h2>
                  <p className="mt-2.5 whitespace-pre-wrap break-words text-sm text-text-tertiary">
                    {application.description}
                  </p>
                </section>
                <HostedDetailsNotices application={application} />
                {manager && (
                  <HostedVersionList
                    application={application}
                    versions={versions}
                    busy={busy}
                    onAction={(version, action) => details.act(version, action)}
                    onResume={details.setResume}
                    onReport={details.setReport}
                    onPreview={(version) => details.open(version)}
                    onUpload={
                      hostedActions(application).some(
                        ({ key, disabled }) => key === 'upload' && !disabled
                      )
                        ? () => actions.select('upload', application)
                        : undefined
                    }
                  />
                )}
                {details.nextCursor && (
                  <Button
                    variant="secondary"
                    className="self-center"
                    disabled={busy}
                    onClick={details.loadMore}
                  >
                    Load older versions
                  </Button>
                )}
              </div>
              <HostedApplicationOverview
                application={application}
                versions={versions}
                sharedWith={creator ? sharedWith.users : undefined}
                sharedWithFailed={sharedWith.failed}
                onRetrySharedWith={sharedWith.reload}
                hasGrants={sharedWith.loaded ? sharedWith.users.length > 0 : undefined}
                className="max-view-details-bp:order-1 max-view-details-bp:min-w-full"
              />
            </div>
          </div>
        )}
      </PageLayout>
      <HostedDetailsDialogs details={details} />
      {actions.dialogs}
    </div>
  )
}
export default HostedApplicationDetails
