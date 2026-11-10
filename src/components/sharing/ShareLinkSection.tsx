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

import React, { useCallback, useEffect, useState } from 'react'

import CopySvg from '@/assets/icons/copy.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import { ButtonType } from '@/constants'
import { copyTextToClipboard } from '@/utils/helpers'
import toaster from '@/utils/toaster'

export interface ShareLinkValue {
  token: string
}

export interface ShareLinkSectionProps {
  getLink: () => Promise<ShareLinkValue | null>
  createLink: () => Promise<ShareLinkValue | null>
  revokeLink: () => Promise<unknown>
  buildUrl: (token: string) => string
  canCreate: boolean
  /** Shown before the link is revoked; people who joined through it lose access. */
  revokeConfirmation?: { header: string; message: string }
}

const DEFAULT_REVOKE_CONFIRMATION = {
  header: 'Revoke the share link?',
  message:
    'The link stops working, and people who joined through it lose access. People shared with by name keep theirs. You can create a new link later.',
}

const ShareLinkSection: React.FC<ShareLinkSectionProps> = ({
  getLink,
  createLink,
  revokeLink,
  buildUrl,
  canCreate,
  revokeConfirmation = DEFAULT_REVOKE_CONFIRMATION,
}) => {
  const [link, setLink] = useState<ShareLinkValue | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmingRevoke, setConfirmingRevoke] = useState(false)
  // Copy may only create a link once the GET has answered that none exists.
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setLoadState('loading')
    getLink()
      .then((loaded) => {
        if (!active) return
        setLink(loaded ?? null)
        setLoadState('ready')
      })
      .catch(() => {
        if (!active) return
        setLink(null)
        setLoadState('failed')
      })
    return () => {
      active = false
    }
  }, [getLink, attempt])

  const copy = async (token: string) => {
    const ok = await copyTextToClipboard(buildUrl(token))
    if (ok) toaster.info('Share link copied to clipboard')
    else toaster.error('Could not copy the link. Click again to copy it.')
  }

  const onCopy = async () => {
    if (loadState !== 'ready') return
    if (link) {
      // Clipboard write must happen synchronously inside the click handler.
      await copy(link.token)
      return
    }
    setBusy(true)
    try {
      const created = await createLink()
      if (!created) {
        toaster.error('Failed to create share link')
        return
      }
      setLink(created)
      await copy(created.token)
    } catch {
      toaster.error('Failed to create share link')
    } finally {
      setBusy(false)
    }
  }

  const onRevoke = useCallback(async () => {
    setConfirmingRevoke(false)
    setBusy(true)
    try {
      await revokeLink()
      setLink(null)
      toaster.info('Share link revoked')
    } catch {
      toaster.error('Failed to revoke share link')
    } finally {
      setBusy(false)
    }
  }, [revokeLink])

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        onClick={onCopy}
        disabled={!canCreate || busy || loadState !== 'ready'}
      >
        <CopySvg aria-hidden="true" />
        Copy share link
      </Button>
      {loadState === 'failed' && (
        <>
          <span className="text-xs text-red-500">Could not load the share link.</span>
          <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>
            Retry
          </Button>
        </>
      )}
      {link && (
        <Button variant="secondary" onClick={() => setConfirmingRevoke(true)} disabled={busy}>
          Revoke link
        </Button>
      )}
      {confirmingRevoke && (
        <ConfirmationModal
          visible
          className="max-sm:!min-w-0"
          header={revokeConfirmation.header}
          message={revokeConfirmation.message}
          confirmText="Revoke link"
          confirmButtonType={ButtonType.DELETE}
          confirmDisabled={busy}
          onCancel={() => setConfirmingRevoke(false)}
          onConfirm={onRevoke}
        />
      )}
    </div>
  )
}

export default ShareLinkSection
