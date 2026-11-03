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
//

import CopySvg from '@/assets/icons/copy.svg?react'
import DownloadSvg from '@/assets/icons/download.svg?react'
import Button from '@/components/Button'
import { ButtonType } from '@/constants'
import { WorkflowExecutionState } from '@/types/entity'

import { useCallHistoryExport } from './useCallHistoryExport'

interface CallHistoryActionsProps {
  state: WorkflowExecutionState
}

const CallHistoryActions = ({ state }: CallHistoryActionsProps) => {
  const { isReady, handleCopy, handleDownload } = useCallHistoryExport(state)

  if (!isReady) return null

  return (
    <div className="flex gap-2">
      <Button variant={ButtonType.SECONDARY} aria-label="Download" onClick={handleDownload}>
        <DownloadSvg />
        Download
      </Button>
      <Button variant={ButtonType.SECONDARY} aria-label="Copy to clipboard" onClick={handleCopy}>
        <CopySvg />
        Copy to clipboard
      </Button>
    </div>
  )
}

export default CallHistoryActions
