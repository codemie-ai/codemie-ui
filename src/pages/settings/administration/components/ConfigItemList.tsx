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

import type { ConfigParam } from '@/types/analytics'
import { formatLabel } from '@/utils/formatLabel'

import ConfigItem from './ConfigItem'

interface ConfigItemListProps {
  items: Record<string, ConfigParam>
  isEditing: boolean
  basePath: string[]
  onUpdate: (path: string[], value: string) => void
}

const ConfigItemList: FC<ConfigItemListProps> = ({ items, isEditing, basePath, onUpdate }) => {
  return (
    <>
      {Object.entries(items).map(([key, param]) => (
        <ConfigItem
          key={key}
          label={formatLabel(key)}
          value={Array.isArray(param.value) ? param.value.join(' - ') : param.value}
          description={param.description}
          isEditing={isEditing}
          onChange={(value) => onUpdate([...basePath, key], value)}
        />
      ))}
    </>
  )
}

export default ConfigItemList
