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

import { move } from '@dnd-kit/helpers'
import { DragDropProvider } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { ReactNode, useState } from 'react'

interface OrderListProps<TItem extends Record<string, unknown>> {
  value: TItem[]
  idKey: Extract<keyof TItem, string | number>
  labelKey?: string
  className?: string
  onChange?: (value: TItem[]) => void
  itemTemplate: (item: TItem, options: { isDragging: boolean }) => ReactNode
}

const OrderList = <TItem extends Record<string, unknown>>({
  value,
  idKey,
  className,
  onChange,
  itemTemplate,
}: OrderListProps<TItem>) => {
  return (
    <div className={className}>
      <DragDropProvider
        onDragEnd={(event) => {
          onChange?.(move(value as any, event))
        }}
      >
        <div className="flex flex-col gap-2">
          {value.map((item, index) => (
            <SortableItem
              index={index}
              key={String(item[idKey])}
              id={String(item[idKey])}
              item={item}
              itemTemplate={itemTemplate}
            />
          ))}
        </div>
      </DragDropProvider>
    </div>
  )
}

export default OrderList

interface SortableItemProps<TItem extends Record<string, unknown>> {
  item: TItem
  id: string
  index: number
  itemTemplate: (item: TItem, options: { isDragging: boolean }) => ReactNode
}

const SortableItem = <TItem extends Record<string, unknown>>({
  item,
  id,
  index,
  itemTemplate,
}: SortableItemProps<TItem>) => {
  const [element, setElement] = useState<Element | null>(null)
  const { isDragging } = useSortable({ id, index, element })

  return (
    <div ref={setElement} className="cursor-grab">
      {itemTemplate(item, { isDragging })}
    </div>
  )
}
