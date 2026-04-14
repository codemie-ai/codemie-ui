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

import { FC, useEffect, useMemo, useState } from 'react'

import Select from '@/components/form/Select/Select'
import Table from '@/components/Table'
import { budgetsStore } from '@/store/budgets'
import { BUDGET_CATEGORY_OPTIONS, BudgetAssignment, BudgetCategory } from '@/types/entity/budget'
import { FilterOption } from '@/types/filters'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'

interface BudgetAssignmentsEditorProps {
  value?: BudgetAssignment[]
  onChange: (assignments: BudgetAssignment[]) => void
  readOnly?: boolean
  hideTitle?: boolean
}

const columnDefinitions: ColumnDefinition[] = [
  {
    key: 'category',
    label: 'Budget Category',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[40%]',
  },
  {
    key: 'budget',
    label: 'Budget Name',
    type: DefinitionTypes.Custom,
  },
]

const normalizeAssignments = (assignments: BudgetAssignment[] = []): BudgetAssignment[] =>
  BUDGET_CATEGORY_OPTIONS.map((option) => {
    const assignment = assignments.find((item) => item.category === option.value)
    return {
      category: option.value,
      budget_id: assignment?.budget_id ?? null,
      budget_name: assignment?.budget_name ?? null,
      max_budget: assignment?.max_budget ?? null,
      budget_duration: assignment?.budget_duration ?? null,
      budget_reset_at: assignment?.budget_reset_at ?? null,
    }
  })

const BudgetAssignmentsEditor: FC<BudgetAssignmentsEditorProps> = ({
  value = [],
  onChange,
  readOnly = false,
  hideTitle = false,
}) => {
  const [optionsByCategory, setOptionsByCategory] = useState<
    Partial<Record<BudgetCategory, FilterOption[]>>
  >({})
  const normalizedAssignments = useMemo(() => normalizeAssignments(value), [value])

  useEffect(() => {
    if (readOnly) return () => {}

    let isMounted = true

    Promise.all(
      BUDGET_CATEGORY_OPTIONS.map((option) =>
        budgetsStore
          .getBudgetOptions(option.value)
          .then((options) => ({ category: option.value, options }))
          .catch(() => ({ category: option.value, options: [] }))
      )
    ).then((loadedOptions) => {
      if (isMounted) {
        setOptionsByCategory(
          loadedOptions.reduce<Partial<Record<BudgetCategory, FilterOption[]>>>(
            (acc, item) => ({ ...acc, [item.category]: item.options }),
            {}
          )
        )
      }
    })

    return () => {
      isMounted = false
    }
  }, [readOnly])

  const handleCategoryChange = (category: BudgetCategory, budgetId: string | null) => {
    onChange(
      normalizedAssignments.map((assignment) =>
        assignment.category === category ? { ...assignment, budget_id: budgetId } : assignment
      )
    )
  }

  const customRenderColumns = useMemo(
    () => ({
      category: (item: BudgetAssignment) => (
        <span className="text-text-primary text-sm break-all">
          {BUDGET_CATEGORY_OPTIONS.find((o) => o.value === item.category)?.label}
        </span>
      ),
      budget: (item: BudgetAssignment) =>
        readOnly ? (
          <div>
            <span className="text-text-primary text-sm">
              {item.budget_name || item.budget_id || '-'}
            </span>
            {item.max_budget != null && (
              <span className="text-text-quaternary text-xs block">
                ${item.max_budget} / {item.budget_duration}
              </span>
            )}
          </div>
        ) : (
          <Select
            value={item.budget_id ?? null}
            options={optionsByCategory[item.category] || []}
            placeholder="No budget"
            showClear
            onChangeValue={(budgetId) =>
              handleCategoryChange(item.category, budgetId ? String(budgetId) : null)
            }
          />
        ),
    }),
    [readOnly, optionsByCategory, normalizedAssignments]
  )

  return (
    <div>
      {!hideTitle && <p className="text-text-quaternary">Budget assignments</p>}
      <Table
        embedded
        idPath="category"
        items={normalizedAssignments}
        columnDefinitions={columnDefinitions}
        customRenderColumns={customRenderColumns}
      />
    </div>
  )
}

export default BudgetAssignmentsEditor
