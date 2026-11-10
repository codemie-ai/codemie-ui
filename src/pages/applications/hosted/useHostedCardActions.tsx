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

import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'

import CopyLinkSvg from '@/assets/icons/copy-link.svg?react'
import DeleteSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import OpenSvg from '@/assets/icons/open.svg?react'
import PlusSvg from '@/assets/icons/plus.svg?react'
import PublishSvg from '@/assets/icons/publish.svg?react'
import RevertSvg from '@/assets/icons/revert.svg?react'
import ShareSvg from '@/assets/icons/share.svg?react'
import StopSvg from '@/assets/icons/stop.svg?react'
import UnpublishSvg from '@/assets/icons/unpublish.svg?react'
import ConfirmationModal from '@/components/ConfirmationModal'
import type { NavigationMenuItem } from '@/components/NavigationMore/NavigationMore'
import { ButtonType } from '@/constants'
import { hostedApplicationsStore as store, hostedErrorMessage } from '@/store/hostedApplications'
import type { HostedApplication } from '@/types/entity/hostedApplication'
import toaster from '@/utils/toaster'

import { hostedActions, type HostedActionKey } from './hostedAccess'
import { hostedRoutes } from './hostedRoutes'
import HostedSecurityDialog, { type HostedSecurityAction } from './HostedSecurityDialog'
import HostedSharePopup from './HostedSharePopup'
import HostedUploadDialog from './HostedUploadDialog'

type Dialog = 'delete' | 'share' | 'upload' | 'revoke_link' | 'publish' | 'unpublish'
type Pending = { kind: Dialog; app: HostedApplication }

interface Options {
  isCurrent(): boolean
  onChanged(): void | Promise<void>
  /** Replaces the refresh after a delete, for pages whose application no longer exists. */
  onDeleted?(): void
  onError(message: string): void
}

const ICONS: Record<HostedActionKey, ReactNode> = {
  open: <OpenSvg />,
  edit: <EditSvg />,
  // New version, as on the details page; the up arrow stays with publishing.
  upload: <PlusSvg />,
  publish: <PublishSvg />,
  unpublish: <UnpublishSvg />,
  share: <ShareSvg />,
  delete: <DeleteSvg />,
  // The bin stays with Delete.
  suspend: <StopSvg />,
  reinstate: <RevertSvg />,
  revoke_link: <CopyLinkSvg />,
}

/** Card overflow actions. Every mutation starts from a fresh revision, never a cached card. */
export const useHostedCardActions = ({ isCurrent, onChanged, onDeleted, onError }: Options) => {
  const navigate = useNavigate()
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)
  const [securityAction, setSecurityAction] = useState<{
    action: HostedSecurityAction
    app: HostedApplication
  } | null>(null)

  const fresh = async (app: HostedApplication) => {
    try {
      const latest = await store.getApplication(app.id)
      return isCurrent() ? latest : null
    } catch (cause) {
      if (isCurrent()) onError(hostedErrorMessage(cause))
      return null
    }
  }

  const prepare = async (kind: Dialog, app: HostedApplication) => {
    const latest = await fresh(app)
    if (latest) setPending({ kind, app: latest })
  }

  // The dialog always closes when the request settles, even after the route or session moved on;
  // only the refresh and the error message belong to the visit that started it.
  const run = async (operation: () => Promise<unknown>, after?: () => void) => {
    setBusy(true)
    try {
      await operation()
      setPending(null)
      if (isCurrent()) await (after ?? onChanged)()
    } catch (cause) {
      setPending(null)
      if (isCurrent()) onError(hostedErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  const moderate = async (action: HostedSecurityAction, app: HostedApplication) => {
    const latest = await fresh(app)
    if (latest) setSecurityAction({ action, app: latest })
  }

  const select = (key: HostedActionKey, app: HostedApplication) => {
    switch (key) {
      case 'open':
        return navigate(hostedRoutes.view(app.id))
      // Editing is a page; it loads the latest revision itself.
      case 'edit':
        return navigate(hostedRoutes.edit(app.id))
      case 'suspend':
      case 'reinstate':
        return moderate(key, app)
      // Needs no revision: the link is revoked by application id, and never read here.
      case 'revoke_link':
        return setPending({ kind: key, app })
      default:
        return prepare(key, app)
    }
  }

  const menuItems = (app: HostedApplication, skip: HostedActionKey[] = []): NavigationMenuItem[] =>
    hostedActions(app)
      .filter(({ key }) => !skip.includes(key))
      .map(({ key, label, disabled }) => ({
        title: label,
        icon: ICONS[key],
        disabled,
        onClick: () => select(key, app),
      }))

  const close = () => {
    if (!busy) setPending(null)
  }
  // Sharing changes keep the popup open; the catalog only refreshes behind it.
  const refresh = () => {
    if (isCurrent()) onChanged()
  }
  const done = () => {
    setPending(null)
    refresh()
  }

  const dialogs = (
    <>
      {securityAction && (
        <HostedSecurityDialog
          action={securityAction.action}
          app={securityAction.app}
          onClose={() => setSecurityAction(null)}
          onDone={() => {
            setSecurityAction(null)
            refresh()
          }}
        />
      )}
      {/* As for skills: publishing reaches everyone, so both directions ask first. */}
      {pending?.kind === 'publish' && (
        <ConfirmationModal
          visible
          className="max-sm:!min-w-0"
          header="Publish to Marketplace?"
          message="Everyone in your organization will be able to find this application in the Marketplace and open it."
          confirmText="Publish"
          confirmDisabled={busy}
          onCancel={close}
          onConfirm={() => run(() => store.publish(pending.app))}
        />
      )}
      {pending?.kind === 'unpublish' && (
        <ConfirmationModal
          visible
          className="max-sm:!min-w-0"
          header="Remove from Marketplace?"
          message="The application leaves the Marketplace. Its project members, people shared with by name and share link users keep access; everyone else loses it."
          confirmText="Remove"
          confirmButtonType={ButtonType.DELETE}
          confirmDisabled={busy}
          onCancel={close}
          onConfirm={() => run(() => store.unpublish(pending.app))}
        />
      )}
      {pending?.kind === 'delete' && (
        <ConfirmationModal
          visible
          className="max-sm:!min-w-0"
          header="Delete this application?"
          message="The application and all of its versions will be deleted. This cannot be undone."
          confirmText="Delete"
          confirmButtonType={ButtonType.DELETE}
          confirmDisabled={busy}
          onCancel={close}
          onConfirm={() => run(() => store.deleteApplication(pending.app), onDeleted)}
        />
      )}
      {pending?.kind === 'revoke_link' && (
        <ConfirmationModal
          visible
          className="max-sm:!min-w-0"
          header="Revoke the share link?"
          message="The link stops working, and people who joined through it lose access. People shared with by name keep theirs. The owner can create a new link later."
          confirmText="Revoke link"
          confirmButtonType={ButtonType.DELETE}
          confirmDisabled={busy}
          onCancel={close}
          onConfirm={() =>
            run(async () => {
              await store.revokeShareLink(pending.app.id)
              // DELETE share-link answers { link: null } whether or not a link was live, so the
              // moderator learns only what is certain: no live link remains.
              toaster.success('No live share link remains')
            })
          }
        />
      )}
      {pending?.kind === 'share' && (
        <HostedSharePopup visible app={pending.app} onHide={close} onChanged={refresh} />
      )}
      {pending?.kind === 'upload' && (
        <HostedUploadDialog application={pending.app} onClose={close} onUploaded={done} />
      )}
    </>
  )

  return { menuItems, select, dialogs }
}
