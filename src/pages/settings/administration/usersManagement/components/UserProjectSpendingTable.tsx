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

import { FC, useEffect, useState } from 'react'
import { Link } from 'react-router'

import InfoWarning from '@/components/InfoWarning'
import Spinner from '@/components/Spinner'
import Table from '@/components/Table'
import { InfoWarningType } from '@/constants'
import { PROJECTS_MANAGEMENT_DETAIL } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import SpendingAmount from '@/pages/settings/administration/components/SpendingAmount'
import { analyticsStore } from '@/store/analytics'
import { BudgetCategory, getBudgetCategoryLabel } from '@/types/entity/budget'
import {
  getCategoryLimit,
  getCategorySpend,
  SPENDING_CATEGORY_KEYS,
  UserProjectSpendingRow,
} from '@/types/entity/userProjectSpending'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'

interface UserProjectSpendingTableProps {
  userEmail: string
}

const spendingCache = new Map<string, UserProjectSpendingRow[]>()
export const clearSpendingCache = (): void => spendingCache.clear()

const columnDefinitions: ColumnDefinition[] = [
  { key: 'project', label: 'Project', type: DefinitionTypes.Custom, headClassNames: 'w-[20%]' },
  ...SPENDING_CATEGORY_KEYS.map((category) => ({
    key: category,
    label: getBudgetCategoryLabel(category),
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[25%]',
  })),
]

interface ProjectLinkCellProps {
  row: UserProjectSpendingRow
}

const ProjectLinkCell: FC<ProjectLinkCellProps> = ({ row }) => {
  const router = useVueRouter()
  const href = router.resolve({
    name: PROJECTS_MANAGEMENT_DETAIL,
    params: { projectName: row.project_name },
  }).fullPath

  return (
    <Link to={href} className="text-text-primary break-all min-w-0 hover:underline">
      {row.display_name || row.project_name}
    </Link>
  )
}

interface CategorySpendCellProps {
  row: UserProjectSpendingRow
  category: BudgetCategory
}

const CategorySpendCell: FC<CategorySpendCellProps> = ({ row, category }) => (
  <SpendingAmount spend={getCategorySpend(row, category)} limit={getCategoryLimit(row, category)} />
)

const customRenderColumns = {
  project: (item: UserProjectSpendingRow) => <ProjectLinkCell row={item} />,
  ...Object.fromEntries(
    SPENDING_CATEGORY_KEYS.map((category) => [
      category,
      (item: UserProjectSpendingRow) => <CategorySpendCell row={item} category={category} />,
    ])
  ),
}

const UserProjectSpendingTable: FC<UserProjectSpendingTableProps> = ({ userEmail }) => {
  const [rows, setRows] = useState<UserProjectSpendingRow[]>(
    () => spendingCache.get(userEmail) ?? []
  )
  const [isLoading, setIsLoading] = useState(() => !spendingCache.has(userEmail))
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setHasError(false)
      try {
        const result = await analyticsStore.fetchUserProjectSpending(userEmail)
        if (cancelled) return

        // The store swallows failures and returns null rather than throwing, so a null
        // result is an error — not an empty breakdown.
        if (!result) {
          setHasError(true)
          return
        }

        const fetchedRows = (result.data?.rows as unknown as UserProjectSpendingRow[]) ?? []
        spendingCache.set(userEmail, fetchedRows)
        setRows(fetchedRows)
      } catch (error) {
        if (cancelled) return
        console.error('Failed to fetch user project spending:', error)
        setHasError(true)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    const cached = spendingCache.get(userEmail)
    if (cached) {
      setRows(cached)
      setIsLoading(false)
      return () => {
        cancelled = true
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [userEmail])

  let content

  if (isLoading) {
    content = (
      <div className="flex items-center justify-center py-4">
        <Spinner inline rootClassName="pt-0" />
      </div>
    )
  } else if (hasError) {
    content = (
      <div className="w-full px-6">
        <InfoWarning
          type={InfoWarningType.ERROR}
          className="w-full"
          message="Could not load project spending for this user."
        />
      </div>
    )
  } else if (!rows.length) {
    content = <p className="text-center text-xs text-text-quaternary">No project spending</p>
  }

  if (content) {
    return <div className="flex min-h-24 items-center justify-center">{content}</div>
  }

  return (
    <Table
      embedded
      variant="nested"
      idPath="project_name"
      items={rows}
      columnDefinitions={columnDefinitions}
      customRenderColumns={customRenderColumns}
    />
  )
}

export default UserProjectSpendingTable
