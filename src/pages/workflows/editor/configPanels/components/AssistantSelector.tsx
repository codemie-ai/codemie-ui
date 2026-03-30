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

import uniqBy from 'lodash/uniqBy'
import { MultiSelectChangeEvent } from 'primereact/multiselect'
import { type MultiSelect as MultiSelectType } from 'primereact/multiselect'
import { useState, useEffect, forwardRef, useRef, useImperativeHandle } from 'react'

import ExternalSvg from '@/assets/icons/external.svg?react'
import Button from '@/components/Button'
import MultiSelect from '@/components/form/MultiSelect'
import { ASSISTANT_DETAILS } from '@/constants/routes'
import { router } from '@/hooks/useVueRouter'
import { assistantsStore } from '@/store/assistants'
import { Assistant } from '@/types/entity/assistant'
import { AssistantConfiguration } from '@/types/workflowEditor/configuration'

interface AssistantSelectorProps {
  assistantConfig: AssistantConfiguration
  onAssistantConfigUpdate: (config: AssistantConfiguration) => void
  issueError?: string
  onIssueChange?: () => void
}

export interface AssistantSelectorRef {
  focus: () => void
  scrollIntoView: (options: ScrollIntoViewOptions) => void
}

type AssistantOption = Record<string, string | { label: string; value: string }>

const AssistantSelector = forwardRef<AssistantSelectorRef, AssistantSelectorProps>(
  ({ assistantConfig, onAssistantConfigUpdate, issueError, onIssueChange }, ref) => {
    const [assistants, setAssistants] = useState<Assistant[]>([])
    const [selectedAssistant, setSelectedAssistant] = useState<Assistant>()
    const [assistantOptions, setAssistantOptions] = useState<AssistantOption[]>([])
    const [error, setError] = useState<string | undefined>()
    const multiSelectRef = useRef<MultiSelectType>(null)

    const handleViewAssistant = () => {
      const route = router.resolve({
        name: ASSISTANT_DETAILS,
        params: { id: assistantConfig?.assistant_id },
      })

      window.open(route.href, '_blank')
    }

    const handleChange = (e: MultiSelectChangeEvent) => {
      const assistantID = e.selectedOption?.value
      if (!assistantID) return

      if (error) {
        setError(undefined)
      }

      onIssueChange?.()

      const assistant = [selectedAssistant, ...assistants].find((item) => item?.id === assistantID)
      if (!assistant) return

      const updatedConfig: AssistantConfiguration = {
        id: assistantConfig.id,
        assistant_id: assistantID,
      }

      onAssistantConfigUpdate(updatedConfig)
    }

    const handleSearch = async (query: string) => {
      const result = await assistantsStore.indexAssistants('all', { search: query })
      setAssistants(result)
    }

    const fetchAssistants = async () => {
      const result = await assistantsStore.indexAssistants('all')
      setAssistants(result)
    }

    const fetchSelectedAssistant = async () => {
      if (!assistantConfig.assistant_id) {
        setSelectedAssistant(undefined)
        setError(undefined)
        return
      }

      try {
        const assistant = await assistantsStore.getAssistant(assistantConfig.assistant_id, true)
        setSelectedAssistant(assistant)

        setError(undefined)
      } catch (err) {
        setSelectedAssistant(undefined)
        setError('Selected assistant was not found')
      }
    }

    useEffect(() => {
      fetchAssistants()
    }, [])

    useEffect(() => {
      fetchSelectedAssistant()
    }, [assistantConfig.assistant_id])

    useEffect(() => {
      const allAssistants = [selectedAssistant, ...assistants]
      const options = uniqBy(allAssistants, 'id')
        .filter((item) => !!item)
        .map((assistant) => ({
          label: assistant.name,
          value: assistant.id,
        }))
      setAssistantOptions(options)
    }, [assistants, selectedAssistant])

    useImperativeHandle(ref, () => ({
      focus: () => {
        const element = multiSelectRef.current?.getElement()
        if (element instanceof HTMLElement) {
          element.focus()
        }
      },
      scrollIntoView: (options: ScrollIntoViewOptions) => {
        const element = multiSelectRef.current?.getElement()
        if (element instanceof HTMLElement) {
          element.scrollIntoView(options)
        }
      },
    }))

    const displayError = error || issueError

    return (
      <div>
        <MultiSelect
          ref={multiSelectRef}
          id="assistant-node-assistant-selector"
          name="assistant-node-assistant-selector"
          size="medium"
          label="Select assistant:"
          placeholder="Select an assistant"
          value={selectedAssistant?.id || ''}
          options={assistantOptions}
          onChange={handleChange}
          onFilter={handleSearch}
          showCheckbox={false}
          singleValue
          error={displayError}
        />

        {assistantConfig?.assistant_id && !displayError && (
          <Button type="secondary" onClick={handleViewAssistant} className="mt-2">
            <ExternalSvg />
            View Assistant
          </Button>
        )}
      </div>
    )
  }
)

AssistantSelector.displayName = 'AssistantSelector'

export default AssistantSelector
