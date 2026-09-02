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

import { useEffect, useState } from 'react'

import AssistantSelector, { AssistantOption } from '@/pages/assistants/components/AssistantSelector'
import { assistantsStore } from '@/store/assistants'

interface AssistantMultiSelectFieldProps {
  label?: string
  project?: string
  value: string[]
  onChange: (ids: string[]) => void
  error?: string
  disabled?: boolean
}

const toNameMap = (assistants: { id: string; name: string }[]): Record<string, string> =>
  Object.fromEntries(assistants.map((assistant) => [assistant.id, assistant.name]))

const AssistantMultiSelectField: React.FC<AssistantMultiSelectFieldProps> = ({
  label,
  project,
  value,
  onChange,
  error,
  disabled,
}) => {
  const [nameCache, setNameCache] = useState<Record<string, string>>({})

  useEffect(() => {
    const unresolvedIds = value.filter((id) => !(id in nameCache))
    if (!unresolvedIds.length) return () => {}

    let cancelled = false
    assistantsStore.getAssistantOptions('', { ids: unresolvedIds, project }).then((assistants) => {
      if (cancelled) return
      setNameCache((prev) => ({ ...prev, ...toNameMap(assistants) }))
    })

    return () => {
      cancelled = true
    }
  }, [value, project, nameCache])

  const selectedOptions: AssistantOption[] = value.map((id) => ({
    id,
    name: nameCache[id] ?? id,
  }))

  const handleChange = (options: AssistantOption[]) => {
    setNameCache((prev) => ({ ...prev, ...toNameMap(options) }))
    onChange(options.map((option) => option.id))
  }

  return (
    <AssistantSelector
      hideHeader
      label={label}
      disabled={disabled}
      project={project}
      value={selectedOptions}
      onChange={handleChange}
      error={error}
      placeholder="Search…"
      resetOnProjectChange={false}
      selectClassName="!rounded-md !py-1.5"
    />
  )
}

export default AssistantMultiSelectField
