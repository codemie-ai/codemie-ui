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

import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { CategorySelector } from '@/pages/assistants/components'
import { hostedApplicationsStore as store, hostedErrorMessage } from '@/store/hostedApplications'
import { hostedCategoryIds, type HostedApplication } from '@/types/entity/hostedApplication'

import { HostedCategoriesNotice, useHostedCategories } from './useHostedCategories'

interface Props {
  app: HostedApplication
  isCurrent(): boolean
  onClose(): void
  onDone(app: HostedApplication): void
}

/** A stale revision is refused with 412, or with 409 carrying the REVISION_CONFLICT code. */
const isRevisionRefusal = (cause: unknown) => {
  const refusal = cause as {
    status?: number
    parsedError?: { details?: { code?: unknown } }
  } | null
  return (
    refusal?.status === 412 ||
    (refusal?.status === 409 && refusal.parsedError?.details?.code === 'REVISION_CONFLICT')
  )
}

const REQUIRED = 'At least one category is required'

/** Publishing reaches everyone, so it asks first and needs one to three categories. */
const HostedPublishDialog = ({ app, isCurrent, onClose, onDone }: Props) => {
  const { status, retry } = useHostedCategories()
  const [selected, setSelected] = useState(() => hostedCategoryIds(app))
  const [revision, setRevision] = useState(app)
  const [required, setRequired] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const alive = useRef(true)
  const key = useRef(crypto.randomUUID())

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // The application changed elsewhere: the next press goes out on its latest revision.
  const reread = async () => {
    try {
      const latest = await store.getApplication(app.id)
      if (!alive.current) return
      setRevision(latest)
      key.current = crypto.randomUUID()
    } catch {
      // The refusal stays on screen; the next press reports anything new.
    }
  }

  const submit = async () => {
    if (busy) return
    if (!selected.length) {
      setRequired(true)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const updated = await store.publish(revision, selected, key.current)
      if (!alive.current) return
      if (isCurrent()) onDone(updated)
      else onClose()
    } catch (cause) {
      if (!alive.current) return
      if (!isCurrent()) {
        onClose()
        return
      }
      setError(hostedErrorMessage(cause))
      if (isRevisionRefusal(cause)) await reread()
    } finally {
      if (alive.current) setBusy(false)
    }
  }

  return (
    <Popup
      visible
      header="Publish to Marketplace?"
      limitWidth
      onHide={() => !busy && onClose()}
      dismissableMask={false}
      footerContent={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy} isLoading={busy} onClick={submit}>
            Publish
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-tertiary">
          Everyone in your organization will be able to find this application in the Marketplace and
          open it.
        </p>
        <CategorySelector
          selectedCategories={selected}
          disabled={busy}
          error={required && !selected.length ? REQUIRED : undefined}
          onCategoriesChange={(categories) => {
            // Different categories are a different request: never replay the earlier key with them.
            key.current = crypto.randomUUID()
            setSelected(categories)
          }}
        />
        <HostedCategoriesNotice status={status} retry={retry} />
        {error && (
          <div role="alert" className="text-failed-secondary">
            {error}
          </div>
        )}
      </div>
    </Popup>
  )
}
export default HostedPublishDialog
