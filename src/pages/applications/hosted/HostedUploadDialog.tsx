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

import { useId, useEffect, useRef, useState } from 'react'

import Button from '@/components/Button'
import Select from '@/components/form/Select'
import Popup from '@/components/Popup'
import { useUnsavedChanges } from '@/hooks/useUnsavedChangesWarning'
import { hostedApplicationsStore as store, hostedErrorMessage } from '@/store/hostedApplications'
import type { HostedTransferProgress as Progress } from '@/store/utils/hostedApplicationUpload'
import type { HostedApplication, HostedVersion } from '@/types/entity/hostedApplication'

import HostedArtifactUpload from './HostedArtifactUpload'
import HostedTransferProgress from './HostedTransferProgress'

interface Props {
  version?: HostedVersion
  application: HostedApplication
  onClose(): void
  onUploaded(): void
}
const HostedUploadDialog = ({ application, version, onClose, onUploaded }: Props) => {
  const selectId = useId()
  const [file, setFile] = useState<File | null>(null)
  const [routing, setRouting] = useState<'static' | 'spa_history'>(
    version?.requested_configuration?.routing_mode ?? 'static'
  )
  const [progress, setProgress] = useState<Progress | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const transfer = useRef<AbortController | null>(null)
  const { attemptFormClose } = useUnsavedChanges({
    formId: 'hosted-upload-' + application.id,
    getCurrentValues: () => ({ file: file?.name ?? null, routing }),
  })
  useEffect(() => () => transfer.current?.abort(), [])
  const close = () =>
    attemptFormClose(
      () => {
        transfer.current?.abort()
        onClose()
      },
      busy
        ? 'Stop this upload? The staged version stays private and can be managed in Versions.'
        : undefined
    )
  const upload = async () => {
    if (busy || (!file && version?.upload.state !== 'stored')) return
    setProgress(null)
    setBusy(true)
    setError(null)
    transfer.current = new AbortController()
    try {
      const latest = await store.getApplication(application.id)
      if (version)
        await store.resumeUpload(latest.id, version, file, transfer.current.signal, setProgress)
      else if (file)
        await store.uploadArtifact(latest, file, routing, transfer.current.signal, setProgress)
      onUploaded()
    } catch (cause) {
      setError(
        (cause as Error)?.name === 'AbortError'
          ? 'Upload stopped. Check Versions before retrying.'
          : hostedErrorMessage(cause)
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <Popup
      visible
      header={version ? 'Resume version ' + version.sequence : 'Upload a new version'}
      limitWidth
      fullScreenOnMobile
      onHide={close}
      dismissableMask={false}
      headerDescription="The new version is checked for security first. People keep seeing the active version until you activate the new one."
      footerContent={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={close}>
            {busy ? 'Stop and close' : 'Cancel'}
          </Button>
          <Button
            disabled={busy || (!file && version?.upload.state !== 'stored')}
            isLoading={busy}
            onClick={upload}
          >
            Upload version
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <HostedArtifactUpload file={file} onChange={setFile} disabled={busy} />
        <Select
          id={selectId + '-navigation'}
          label="Navigation"
          value={routing}
          disabled={busy || !!version}
          options={[
            { label: 'Static pages / hash routing', value: 'static' },
            { label: 'Single-page app with history routing', value: 'spa_history' },
          ]}
          onChangeValue={(value) => setRouting(value === 'spa_history' ? value : 'static')}
        />
        <p className="-mt-2 text-xs text-text-quaternary">
          Choose history routing when your app uses paths such as /settings (React Router
          BrowserRouter, Angular path routing); unknown paths then open your index.html.
        </p>
        {busy && <HostedTransferProgress progress={progress} />}
        {error && (
          <p role="alert" className="text-failed-secondary break-words">
            {error}
          </p>
        )}
      </div>
    </Popup>
  )
}
export default HostedUploadDialog
