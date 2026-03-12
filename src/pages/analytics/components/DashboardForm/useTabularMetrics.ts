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

import { analyticsStore } from '@/store/analytics'
import { TabularMetricType, ColumnDefinition, ColumnType } from '@/types/analytics'

/**
 * Custom hook to fetch column schema for a given metric type
 * Returns available columns that can be used for valueField/labelField
 */
export const useTabularMetrics = (metricType: TabularMetricType | null) => {
  const [columns, setColumns] = useState<ColumnDefinition[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!metricType) {
      setColumns([])
      setError(null)
      return
    }

    const fetchSchema = async () => {
      setLoading(true)
      setError(null)

      try {
        // Fetch schema by making API call with minimal pagination (only need columns)
        const response = await analyticsStore.fetchTabularData(metricType, {
          page: 0,
          per_page: 1,
        })

        if (response?.data?.columns) {
          setColumns(response.data.columns)
        } else {
          setError('No column schema available')
          setColumns([])
        }
      } catch (err) {
        console.error('Error fetching metric schema:', err)
        setError('Failed to fetch column schema')
        setColumns([])
      } finally {
        setLoading(false)
      }
    }

    fetchSchema()
  }, [metricType])

  // Separate columns by type for smart field selection
  const numericColumns = columns.filter(
    (col) => col.type === ColumnType.INTEGER || col.type === ColumnType.NUMBER
  )
  const stringColumns = columns.filter((col) => col.type === ColumnType.STRING)

  return {
    columns,
    numericColumns,
    stringColumns,
    loading,
    error,
  }
}
