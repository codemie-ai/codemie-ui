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

import { useSortable } from '@dnd-kit/react/sortable'
import { FC } from 'react'

import CrossSvg from '@/assets/icons/cross.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import EyeSvg from '@/assets/icons/eye.svg?react'
import OrderListButton from '@/components/form/OrderList/OrderListButton'
import OrderListTemplate from '@/components/form/OrderList/OrderListTemplate'
import { AnalyticsWidgetItem } from '@/types/analytics'

import { UseWidgetFormStateReturn } from '../DashboardWidgetForm/useWidgetFormState'

export interface WidgetMethods {
  onAdd: UseWidgetFormStateReturn['onAddWidget']
  onEdit: UseWidgetFormStateReturn['onEditWidget']
  onDelete: UseWidgetFormStateReturn['onDeleteWidgetClick']
  onPreview: (sectionIndex: number, widgetId: string) => void
}

interface OrderListWidgetProps {
  widget: AnalyticsWidgetItem
  index: number
  sectionId: string
  sectionIndex: number
  widgetMethods: WidgetMethods
}

const OrderListWidget: FC<OrderListWidgetProps> = ({
  widget,
  index,
  sectionId,
  sectionIndex,
  widgetMethods,
}) => {
  const { ref } = useSortable({
    id: widget.id,
    index,
    type: 'item',
    accept: 'item',
    group: sectionId,
  })

  return (
    <div ref={ref}>
      <OrderListTemplate
        name={widget.title}
        description={`${widget.metricType} / ${widget.widgetType}`}
        actions={
          <>
            <OrderListButton
              aria-label="Preview widget"
              onClick={() => widgetMethods.onPreview(sectionIndex, widget.id)}
            >
              <EyeSvg className="size-4" />
            </OrderListButton>

            <OrderListButton
              aria-label="Edit widget"
              onClick={() => widgetMethods.onEdit(sectionIndex, widget.id)}
            >
              <EditSvg />
            </OrderListButton>

            <OrderListButton
              aria-label="Remove"
              onClick={() => widgetMethods.onDelete(sectionIndex, widget.id)}
            >
              <CrossSvg />
            </OrderListButton>
          </>
        }
      />
    </div>
  )
}

export default OrderListWidget
