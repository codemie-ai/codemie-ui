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
import { ComponentProps, FC, useMemo } from 'react'

import { AnalyticsSectionItem } from '@/types/analytics'

import { OrderListSection, SectionMethods } from './OrderListSection'
import OrderListWidget, { WidgetMethods } from './OrderListWidget'

const sectionsToItems = (sections: AnalyticsSectionItem[]) => {
  return Object.fromEntries(
    sections.map((section) => [section.id, section.widgets.map((widget) => widget.id)])
  )
}

const itemsToSections = (
  items: Record<string, string[]>,
  originalSections: AnalyticsSectionItem[]
): AnalyticsSectionItem[] => {
  const sectionMap = new Map(originalSections.map((s) => [s.id, s]))
  const widgetMap = new Map(
    originalSections.flatMap((section) => section.widgets.map((widget) => [widget.id, widget]))
  )

  return Object.entries(items)
    .map(([sectionId, widgetIds]) => {
      const section = sectionMap.get(sectionId)
      if (!section) {
        console.error(`Section ${sectionId} not found`)
        return null
      }

      return {
        ...section,
        widgets: widgetIds
          .map((widgetId) => widgetMap.get(widgetId))
          .filter(Boolean) as typeof section.widgets,
      }
    })
    .filter(Boolean) as AnalyticsSectionItem[]
}

interface DashboardOrderListProps {
  sections: AnalyticsSectionItem[]
  onChange: (sections: AnalyticsSectionItem[]) => void
  widgetMethods: WidgetMethods
  sectionMethods: SectionMethods
}

const DashboardOrderList: FC<DashboardOrderListProps> = ({
  sections,
  onChange,
  widgetMethods,
  sectionMethods,
}) => {
  const itemsOrder = useMemo(() => sections.map((s) => s.id), [sections])
  const items = useMemo(() => sectionsToItems(sections), [sections])

  const handleDragOver: ComponentProps<typeof DragDropProvider>['onDragOver'] = (event) => {
    const { source } = event.operation
    if (source?.type === 'column') return

    const newSections = itemsToSections(move(items, event), sections)
    onChange(newSections)
  }

  const handleDragEnd: ComponentProps<typeof DragDropProvider>['onDragEnd'] = (event) => {
    const { source } = event.operation

    if (event.canceled || source?.type !== 'column') return

    const sectiondIds = move(itemsOrder, event)
    onChange(sectiondIds.map((sectionId) => sections.find((s) => s.id === sectionId)!))
  }

  if (!sections.length)
    return (
      <p className="flex flex-col text-center gap-8 py-8 text-text-tertiary leading-6">
        No sections yet. Click &quot;Add New Section&quot; to get started.
      </p>
    )

  return (
    <div className="flex flex-col gap-2">
      <DragDropProvider onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        {sections.map((section, sectionIndex) => (
          <OrderListSection
            key={section.id}
            section={section}
            index={sectionIndex}
            widgetMethods={widgetMethods}
            sectionMethods={sectionMethods}
          >
            {section.widgets.length ? (
              <div className="flex flex-col gap-2">
                {section.widgets.map((widget, widgetIndex) => (
                  <OrderListWidget
                    key={widget.id}
                    widget={widget}
                    index={widgetIndex}
                    sectionId={section.id}
                    sectionIndex={sectionIndex}
                    widgetMethods={widgetMethods}
                  />
                ))}
              </div>
            ) : (
              <p className="text-text-quaternary text-sm text-center h-[38px]">No Widgets</p>
            )}
          </OrderListSection>
        ))}
      </DragDropProvider>
    </div>
  )
}

export default DashboardOrderList
