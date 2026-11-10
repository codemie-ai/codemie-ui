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

import { useEffect, useId, useState } from 'react'
import { useSnapshot } from 'valtio'

import FilesDropzone from '@/components/form/FilesDropzone'
import { hostedApplicationsStore as store } from '@/store/hostedApplications'
import {
  hostedArtifactKind,
  hostedUploadLimits,
  type HostedUploadLimits,
} from '@/store/utils/hostedApplicationUpload'

import { formatBytes } from './hostedVersionStatus'

interface Props {
  file: File | null
  onChange(file: File | null): void
  disabled?: boolean
  optional?: boolean
}

const MEBIBYTE = 1024 ** 2

const formatMebibytes = (bytes: number) => `${Number((bytes / MEBIBYTE).toFixed(1))} MiB`

/** Why `file` cannot be uploaded under `limits`, or `null` when it can. */
const artifactError = (file: File, limits: HostedUploadLimits): string | null => {
  const kind = hostedArtifactKind(file.name)
  if (!kind) return 'Choose an HTML file or a ZIP containing a static build.'
  const maximum = kind === 'html' ? limits.htmlBytes : limits.zipBytes
  if (file.size > 0 && file.size <= maximum) return null
  const label = kind === 'html' ? 'HTML' : 'ZIP'
  return `${label} files must be between 1 byte and ${formatMebibytes(maximum)}.`
}

const HostedArtifactUpload = ({ file, onChange, disabled = false, optional = false }: Props) => {
  const id = useId()
  const { usage, capabilities } = useSnapshot(store)
  // Hints and validation follow the limits the server publishes in its capabilities.
  const limits = hostedUploadLimits(capabilities)
  const hint =
    `HTML up to ${formatMebibytes(limits.htmlBytes)}, or a ZIP of prebuilt static files up to ` +
    `${formatMebibytes(limits.zipBytes)}. For a card cover, include ` +
    'preview.png, preview.jpg, or preview.webp in a ZIP. Your app stays private while it is validated.'
  const [error, setError] = useState<string | null>(null)
  // The usage line is a hint: a failure to load it never blocks the upload.
  useEffect(() => {
    store.loadUsage().catch(() => undefined)
  }, [])
  const handleChange = (files: File[]) => {
    if (disabled) return
    const candidate = files[0] ?? null
    const message = candidate ? artifactError(candidate, limits) : null
    setError(message)
    if (!message) onChange(candidate)
  }
  return (
    <div className="flex flex-col gap-2">
      <FilesDropzone
        name={'hosted-artifact-' + id}
        label={'Application file' + (optional ? ' (optional)' : '')}
        files={file ? [file] : []}
        maxFiles={1}
        // handleChange checks the size per artifact kind; the shared dropzone must not cap it.
        maxFileSizeBytes={Number.POSITIVE_INFINITY}
        accept=".html,.htm,.zip"
        disabled={disabled}
        onChange={handleChange}
        errors={error ? [{ message: error }] : []}
        showErrors
        hint={hint}
      />
      {usage && (
        <p className="text-xs text-text-quaternary">
          Your applications use{' '}
          {((usage.stored_bytes + usage.reserved_bytes) / MEBIBYTE).toFixed(1)} MiB of{' '}
          {formatBytes(usage.byte_limit)}. This includes all uploaded versions and space reserved
          for files being validated.
        </p>
      )}
    </div>
  )
}
export default HostedArtifactUpload
