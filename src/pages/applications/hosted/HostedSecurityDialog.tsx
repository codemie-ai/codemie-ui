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

import { useEffect, useId, useRef, useState } from 'react'

import Button from '@/components/Button'
import Textarea from '@/components/form/Textarea'
import Popup from '@/components/Popup'
import { hostedApplicationsStore as store, hostedErrorMessage } from '@/store/hostedApplications'
import type { HostedApplication } from '@/types/entity/hostedApplication'

export type HostedSecurityAction = 'suspend' | 'reinstate'

interface Props {
  action: HostedSecurityAction
  app: HostedApplication
  onClose(): void
  onDone(app: HostedApplication): void
}

const COPY = {
  suspend: {
    label: 'Suspend',
    header: 'Suspend this application?',
    hint: 'The application stops serving visitors until it is reinstated.',
  },
  reinstate: {
    label: 'Reinstate',
    header: 'Reinstate this application?',
    hint: 'The application becomes available to visitors again.',
  },
}

/** Moderator Suspend/Reinstate: a required reason, nothing else is sent. */
const HostedSecurityDialog = ({ action, app, onClose, onDone }: Props) => {
  const reasonId = useId()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const alive = useRef(true)
  const key = useRef(crypto.randomUUID())
  const { label, header, hint } = COPY[action]
  const trimmed = reason.trim()

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const submit = async () => {
    if (!trimmed || busy) return
    setBusy(true)
    setError(null)
    try {
      const updated = await store.security(app, action, trimmed, key.current)
      if (alive.current) onDone(updated)
    } catch (cause) {
      if (alive.current) setError(hostedErrorMessage(cause))
    } finally {
      if (alive.current) setBusy(false)
    }
  }

  return (
    <Popup
      visible
      header={header}
      limitWidth
      onHide={() => !busy && onClose()}
      dismissableMask={false}
      footerContent={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!trimmed || busy} isLoading={busy} onClick={submit}>
            {label}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-tertiary">{hint}</p>
        <Textarea
          id={reasonId}
          label="Reason"
          rows={4}
          value={reason}
          disabled={busy}
          onChange={(event) => {
            // A different reason is a different request: never replay the earlier key with it.
            key.current = crypto.randomUUID()
            setReason(event.target.value)
          }}
        />
        {error && (
          <div role="alert" className="text-failed-secondary">
            {error}
          </div>
        )}
      </div>
    </Popup>
  )
}
export default HostedSecurityDialog
