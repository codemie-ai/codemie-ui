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

import IconCode from '@/assets/icons/code.svg?react'
import IconConfluence from '@/assets/icons/confluence.svg?react'
import IconFile from '@/assets/icons/file.svg?react'
import IconGoogle from '@/assets/icons/google.svg?react'
import IconJira from '@/assets/icons/jira.svg?react'
import IconSharePoint from '@/assets/icons/sharepoint.svg?react'
import { INDEX_TYPES } from '@/constants'

const DataSourceTypeIcon: FC<{ type: string; classNames?: string }> = ({ type, classNames }) => {
  const Icon =
    {
      [INDEX_TYPES.GIT]: IconCode,
      [INDEX_TYPES.FILE]: IconFile,
      [INDEX_TYPES.JIRA]: IconJira,
      [INDEX_TYPES.GOOGLE]: IconGoogle,
      [INDEX_TYPES.CONFLUENCE]: IconConfluence,
      [INDEX_TYPES.AZURE_DEVOPS_WIKI]: IconCode,
      [INDEX_TYPES.AZURE_DEVOPS_WORK_ITEM]: IconCode,
      [INDEX_TYPES.SHAREPOINT]: IconSharePoint,
    }[type] ?? IconCode

  return <Icon className={classNames} />
}

export default DataSourceTypeIcon
