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

import type { HostedTransferProgress as Progress } from '@/store/utils/hostedApplicationUpload'

const HostedTransferProgress = ({ progress }: { progress: Progress | null }) => {
  if (!progress) return null
  const complete = progress.confirmed === progress.total
  return (
    <output aria-live="polite" className="flex flex-col gap-2 text-sm text-text-secondary">
      <progress
        className="w-full"
        aria-label="Confirmed artifact transfer"
        max={progress.total}
        value={complete ? progress.confirmed : undefined}
      />
      <span>
        {complete
          ? '100% uploaded. Starting security checks…'
          : 'Uploading ' +
            (progress.total / 1024 / 1024).toFixed(1) +
            ' MiB. Waiting for the verified receipt…'}
      </span>
    </output>
  )
}
export default HostedTransferProgress
