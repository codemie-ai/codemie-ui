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

import React from 'react'

import NavigationMore from '@/components/NavigationMore'

export interface KataActionItem {
  id: string
  label: string
  icon: React.ReactNode
  isVisible?: boolean
  disabled?: boolean
  onClick: () => void
}

interface KataMenuProps {
  actions: KataActionItem[]
}

const KataMenu: React.FC<KataMenuProps> = ({ actions }) => {
  const visibleActions = actions.filter((action) => action.isVisible)

  if (visibleActions.length === 0) {
    return null
  }

  const actionItems = visibleActions.map((action) => {
    return {
      title: action.label,
      onClick: action.onClick,
      icon: action.icon,
      disabled: action.disabled,
    }
  })

  return <NavigationMore hideOnClickInside items={actionItems} />
}

export default KataMenu
