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

import { FC } from 'react'

import type { UaCategoryRow } from '@/types/usageAttribution'

import { UA_CATEGORY_LABELS } from '../constants'
import { formatMoney, formatNumber, formatShare } from '../utils'
import { LocalTable, UaColumn } from './UaTable'
import { CategoryBadge } from '../widgets/Badges'

interface Props {
  rows: UaCategoryRow[]
  cli: number
  /** Total Spend: all spend in the period, Web Platform included. */
  total: number
}

/** CLI Spend by Category, as a share of CLI spend and of all spend. */
const CliCategoriesTable: FC<Props> = ({ rows, cli, total }) => {
  const sum = (key: keyof UaCategoryRow) => rows.reduce((s, r) => s + Number(r[key] ?? 0), 0)
  const ofTotal = (spend: number) => (total ? (spend / total) * 100 : null)
  const columns: UaColumn<UaCategoryRow>[] = [
    {
      key: 'category',
      label: 'Category',
      render: (r) => <CategoryBadge category={r.category} />,
      sortValue: (r) => UA_CATEGORY_LABELS[r.category],
    },
    {
      key: 'spend',
      label: 'CLI Spend',
      numeric: true,
      render: (r) => formatMoney(r.spend),
      total: formatMoney(sum('spend')),
    },
    {
      key: 'cli_share',
      label: '% of CLI Spend',
      numeric: true,
      sortValue: (r) => r.spend,
      render: (r) => (cli ? `${((r.spend / cli) * 100).toFixed(1)}%` : '—'),
      total: cli ? '100%' : '',
    },
    {
      key: 'share',
      label: '% of Total Spend',
      numeric: true,
      tooltip:
        "The category's CLI spend as a share of Total Spend, all spend in the period, Web Platform included. The total row is CLI's share.",
      sortValue: (r) => r.spend,
      render: (r) => formatShare(ofTotal(r.spend)),
      total: formatShare(ofTotal(sum('spend'))),
    },
    {
      key: 'cb',
      label: 'Charged Back',
      numeric: true,
      render: (r) => formatMoney(r.cb),
      total: formatMoney(sum('cb')),
    },
    {
      key: 'sh',
      label: 'Shared Project, No Budget',
      numeric: true,
      render: (r) => formatMoney(r.sh),
      total: formatMoney(sum('sh')),
    },
    {
      key: 'pe',
      label: 'Personal Project',
      numeric: true,
      render: (r) => formatMoney(r.pe),
      total: formatMoney(sum('pe')),
    },
    { key: 'users', label: 'Users', numeric: true, render: (r) => formatNumber(r.users) },
  ]
  return (
    <LocalTable
      ariaLabel="CLI spend by category"
      columns={columns}
      rows={rows}
      idKey="category"
      defaultSort={{ sortKey: 'spend', sortOrder: 'desc' }}
      showTotals
    />
  )
}

export default CliCategoriesTable
