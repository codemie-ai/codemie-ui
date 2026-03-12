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

import { classNames } from 'primereact/utils'
import React from 'react'

import SortDescSvg from '@/assets/icons/sort-down.svg?react'
import SortAscSvg from '@/assets/icons/sort-up.svg?react'
import SortSvg from '@/assets/icons/sort.svg?react'
import { SortState } from '@/types/table'

interface SortIconProps {
  sorted: boolean
  order?: SortState['sortOrder']
  onClick(): void
}

const SortIcon: React.FC<SortIconProps> = ({ sorted, order, onClick }) => {
  const className = classNames('inline ml-[6px] cursor-pointer', {
    'fill-text-accent-hover': sorted,
    'fill-icon-tertiary': !sorted,
  })

  let IconComponent = SortSvg
  if (sorted && order === 'asc') IconComponent = SortAscSvg
  if (sorted && order === 'desc') IconComponent = SortDescSvg
  return <IconComponent className={className} onClick={onClick} />
}

export default SortIcon
