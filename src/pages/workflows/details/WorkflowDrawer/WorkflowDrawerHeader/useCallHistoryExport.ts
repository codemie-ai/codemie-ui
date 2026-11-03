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

import { useSnapshot } from 'valtio'

import { downloadCodeAsFile } from '@/components/CodeBlock/fileExtensions'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import { Thought, WorkflowExecutionState } from '@/types/entity'
import { copyTextToClipboard } from '@/utils/helpers'
import toaster from '@/utils/toaster'

import {
  buildCallHistoryExport,
  formatCallHistoryJson,
  getCallHistoryFilename,
} from './callHistoryExport'

export const useCallHistoryExport = (state: WorkflowExecutionState) => {
  const { executionStatesThoughts } = useSnapshot(workflowExecutionsStore)

  const isReady =
    state.thoughts.length > 0 &&
    state.thoughts.every((thought) => executionStatesThoughts.some((t) => t.id === thought.id))

  const buildJson = (): string | null => {
    const thoughts = state.thoughts
      .map((thought) => workflowExecutionsStore.getStateThought(thought.id))
      .filter((thought): thought is Thought => !!thought)
    const exp = buildCallHistoryExport(state, thoughts)
    if (!exp) {
      toaster.info('No call history records to export')
      return null
    }
    return formatCallHistoryJson(exp)
  }

  const handleCopy = async () => {
    const json = buildJson()
    if (!json) return
    const copied = await copyTextToClipboard(json)
    if (copied) {
      toaster.success('Call history copied to clipboard')
    } else {
      toaster.error(
        'Could not copy call history. Clipboard access is unavailable; use Download instead.'
      )
    }
  }

  const handleDownload = () => {
    const json = buildJson()
    if (!json) return
    try {
      downloadCodeAsFile(json, 'json', getCallHistoryFilename(state))
      toaster.success('Call history downloaded')
    } catch (error) {
      console.error(error)
      toaster.error('Could not download call history. Please try again.')
    }
  }

  return { isReady, handleCopy, handleDownload }
}
