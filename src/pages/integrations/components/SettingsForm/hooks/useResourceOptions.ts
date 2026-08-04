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

import { useState, useEffect } from 'react'

import { assistantsStore } from '@/store/assistants'
import { dataSourceStore } from '@/store/dataSources'
import { workflowsStore } from '@/store/workflows'

type ResourceOption = { label: string; value: string }

export function useResourceOptions(resourceType: string): {
  options: ResourceOption[]
  loading: boolean
} {
  const [options, setOptions] = useState<ResourceOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!resourceType) {
      setOptions([])
      setLoading(false)
      return () => {}
    }
    let cancelled = false
    setLoading(true)
    const fetchOptions = async () => {
      try {
        let mapped: ResourceOption[] = []
        if (resourceType === 'assistant') {
          const data = await assistantsStore.getAssistantOptions()
          mapped = data.map((item: { id: string; name: string }) => ({
            label: item.name,
            value: String(item.id),
          }))
        } else if (resourceType === 'workflow') {
          const data = await workflowsStore.getWorkflowOptions()
          mapped = data.map((item: { id: string; name: string }) => ({
            label: item.name,
            value: String(item.id),
          }))
        } else if (resourceType === 'datasource') {
          const data = await dataSourceStore.getDataSourceOptions()
          mapped = data.map((item: { id: string; repo_name: string }) => ({
            label: item.repo_name,
            value: String(item.id),
          }))
        }
        if (!cancelled) setOptions(mapped)
      } catch {
        if (!cancelled) setOptions([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchOptions()
    return () => {
      cancelled = true
    }
  }, [resourceType])

  return { options, loading }
}
