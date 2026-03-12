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

import { CollisionPriority } from '@dnd-kit/abstract'
import { useSortable } from '@dnd-kit/react/sortable'
import { FC, ReactNode } from 'react'

import DeleteSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import HamburgerSvg from '@/assets/icons/hamburger.svg?react'
import PlusSvg from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import OrderListButton from '@/components/form/OrderList/OrderListButton'
import { AnalyticsDashboardItem, AnalyticsSectionItem } from '@/types/analytics'

import { WidgetMethods } from './OrderListWidget'
import { UseSectionFormStateReturn } from '../DashboardSectionForm/useSectionFormState'

export interface SectionMethods {
  onEdit: UseSectionFormStateReturn['onEditSection']
  onDelete: UseSectionFormStateReturn['onDeleteSectionClick']
  onOrderChange?: (newSections: AnalyticsDashboardItem['sections']) => void
}

export interface OrderListSectionProps {
  section: AnalyticsSectionItem
  index: number
  children: ReactNode
  widgetMethods: WidgetMethods
  sectionMethods: SectionMethods
}

export const OrderListSection: FC<OrderListSectionProps> = ({
  section,
  index,
  children,
  widgetMethods,
  sectionMethods,
}) => {
  const { ref } = useSortable({
    id: section.id,
    index,
    type: 'column',
    collisionPriority: CollisionPriority.Low,
    accept: ['item', 'column'],
  })

  return (
    <section
      ref={ref}
      className="flex flex-col transition duration-75 rounded-lg border bg-surface-base-primary border-border-specific-panel-outline pt-3 pb-4 px-4 cursor-grab"
    >
      <div className="group/section flex items-center gap-3 mb-2">
        <HamburgerSvg className="cursor-move opacity-75 group-hover/section:opacity-100 transition duration-75 shrink-0" />
        <h3 className="font-medium group-hover/section:text-text-primary mb-0 text-text-tertiary transition duration-75 text-nowrap truncate">
          {section.name}
        </h3>
        <div className="flex">
          <OrderListButton aria-label="Edit section" onClick={() => sectionMethods.onEdit(index)}>
            <EditSvg />
          </OrderListButton>
          <OrderListButton
            aria-label="Delete section"
            onClick={() => sectionMethods.onDelete(index)}
          >
            <DeleteSvg />
          </OrderListButton>
        </div>
      </div>

      <div className="mb-2">{children}</div>

      <Button className="grow" variant="secondary" onClick={() => widgetMethods.onAdd(index)}>
        <PlusSvg />
        Add New Widget
      </Button>
    </section>
  )
}
