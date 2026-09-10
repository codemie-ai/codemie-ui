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

import Spinner from '@/components/Spinner'
import Tabs, { Tab } from '@/components/Tabs/Tabs'
import { ASSISTANT_INDEX_SCOPES, AssistantIndexScope } from '@/constants/assistants'
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

type ScopeTabId = 'all' | 'project' | 'marketplace'

const SCOPE_TAB_TO_INDEX_SCOPE: Record<ScopeTabId, AssistantIndexScope> = {
  all: ASSISTANT_INDEX_SCOPES.ALL, // project + all marketplace
  project: ASSISTANT_INDEX_SCOPES.VISIBLE_TO_USER, // only project scoped
  marketplace: ASSISTANT_INDEX_SCOPES.MARKETPLACE, // all marketplace (no project filtering)
}

const SCOPE_TABS: Tab<ScopeTabId>[] = [
  { id: 'all', label: 'All', element: null },
  { id: 'project', label: 'Project', element: null },
  { id: 'marketplace', label: 'Marketplace', element: null },
]

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
  const [scopeTab, setScopeTab] = useState<ScopeTabId>('project')

  const unresolvedIds = value.filter((id) => !(id in nameCache))
  const isResolvingNames = unresolvedIds.length > 0

  useEffect(() => {
    if (!unresolvedIds.length) return () => {}

    let cancelled = false

    assistantsStore
      .getAssistantOptions('', { ids: unresolvedIds }, ASSISTANT_INDEX_SCOPES.ALL)
      .then((assistants) => {
        if (cancelled) return
        const found = toNameMap(assistants)
        // Assistants the fetch didn't return (e.g. deleted) still need a resolved
        // entry, otherwise they'd be treated as unresolved forever.
        const fallback = Object.fromEntries(
          unresolvedIds.filter((id) => !(id in found)).map((id) => [id, id])
        )
        setNameCache((prev) => ({ ...prev, ...found, ...fallback }))
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, nameCache])

  const selectedOptions: AssistantOption[] = value.map((id) => ({
    id,
    name: nameCache[id] ?? id,
  }))

  const handleChange = (options: AssistantOption[]) => {
    setNameCache((prev) => ({ ...prev, ...toNameMap(options) }))
    onChange(options.map((option) => option.id))
  }

  if (isResolvingNames) {
    return <Spinner inline />
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
      scope={SCOPE_TAB_TO_INDEX_SCOPE[scopeTab]}
      showScopeBadge={SCOPE_TAB_TO_INDEX_SCOPE[scopeTab] === ASSISTANT_INDEX_SCOPES.ALL}
      panelHeaderExtra={
        <Tabs
          isSmall
          tabs={SCOPE_TABS}
          activeTab={scopeTab}
          onChange={setScopeTab}
          alwaysShowTabs
          className="px-3 py-1"
          headerClassName="mb-0"
        />
      }
    />
  )
}

export default AssistantMultiSelectField
