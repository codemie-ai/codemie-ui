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

import { useCallback, useMemo, useState } from 'react'
import { UseFormSetValue } from 'react-hook-form'

import type {
  AnalyticsDashboardItem,
  AnalyticsSectionItem,
  AnalyticsWidgetItem,
} from '@/types/analytics'

import { AnalyticsWidgetFormSchema } from './DashboardWidgetForm'

interface WidgetFormState {
  visible: boolean
  sectionIndex: number | null
  editingWidgetId: string | null
}

interface WidgetDeleteState {
  sectionIndex: number
  widgetId: string
}

interface UseWidgetFormStateOptions {
  sections: AnalyticsSectionItem[]
  setValue: UseFormSetValue<AnalyticsDashboardItem>
}

export interface UseWidgetFormStateReturn {
  widgetFormState: WidgetFormState
  onAddWidget: (sectionIndex: number) => void
  onEditWidget: (sectionIndex: number, widgetId: string) => void
  onDeleteWidgetClick: (sectionIndex: number, widgetId: string) => void
  onDeleteWidgetConfirm: () => void
  onCancelDeleteWidget: () => void
  onCloseWidgetForm: () => void
  onWidgetFormSubmit: (data: AnalyticsWidgetFormSchema) => void
  widgetFormInitialData: AnalyticsWidgetFormSchema | null
  deletingWidget: AnalyticsWidgetItem | null
}

/**
 * Custom hook to manage widget form state (add/edit modal)
 * Handles opening/closing the widget form and submitting widget data
 */
export const useWidgetFormState = ({
  sections,
  setValue,
}: UseWidgetFormStateOptions): UseWidgetFormStateReturn => {
  const [widgetDeleteState, setWidgetDeleteState] = useState<WidgetDeleteState | null>(null)
  const [widgetFormState, setWidgetFormState] = useState<WidgetFormState>({
    visible: false,
    sectionIndex: null,
    editingWidgetId: null,
  })

  const generateId = () => crypto.randomUUID()

  const onAddWidget = useCallback((sectionIndex: number) => {
    setWidgetFormState({
      visible: true,
      sectionIndex,
      editingWidgetId: null,
    })
  }, [])

  const onEditWidget = useCallback((sectionIndex: number, widgetId: string) => {
    setWidgetFormState({
      visible: true,
      sectionIndex,
      editingWidgetId: widgetId,
    })
  }, [])

  const onDeleteWidgetClick = useCallback((sectionIndex: number, widgetId: string) => {
    setWidgetDeleteState({ sectionIndex, widgetId })
  }, [])

  const onDeleteWidgetConfirm = useCallback(() => {
    if (!widgetDeleteState) return
    const { sectionIndex, widgetId } = widgetDeleteState

    const section = sections[sectionIndex]
    const updatedWidgets = section.widgets.filter((widget) => widget.id !== widgetId)

    setValue(`sections.${sectionIndex}.widgets`, updatedWidgets)
    setWidgetDeleteState(null)
  }, [widgetDeleteState, sections])

  const onCancelDeleteWidget = useCallback(() => {
    setWidgetDeleteState(null)
  }, [])

  const onCloseWidgetForm = useCallback(() => {
    setWidgetFormState({
      visible: false,
      sectionIndex: null,
      editingWidgetId: null,
    })
  }, [])

  const onWidgetFormSubmit = useCallback(
    (data: AnalyticsWidgetFormSchema) => {
      const { sectionIndex, editingWidgetId } = widgetFormState

      if (sectionIndex === null) return

      const section = sections[sectionIndex]
      const widgets = section?.widgets ?? []

      if (editingWidgetId) {
        // Edit existing widget
        const updatedWidgets = widgets.map((widget) =>
          widget.id === editingWidgetId ? { ...widget, ...data } : widget
        )
        setValue(`sections.${sectionIndex}.widgets`, updatedWidgets as AnalyticsWidgetItem[])
      } else {
        // Add new widget
        const newWidget = { id: generateId(), ...data } as AnalyticsWidgetItem
        setValue(`sections.${sectionIndex}.widgets`, [...widgets, newWidget])
      }
    },
    [sections, widgetFormState, setValue]
  )

  const widgetFormInitialData = useMemo<AnalyticsWidgetFormSchema | null>(() => {
    const { sectionIndex, editingWidgetId } = widgetFormState

    if (sectionIndex === null || !editingWidgetId) return null

    const section = sections[sectionIndex]
    const widget = section?.widgets?.find((w) => w.id === editingWidgetId)

    if (!widget) return null

    return { ...widget }
  }, [widgetFormState, sections])

  const deletingWidget = useMemo<AnalyticsWidgetItem | null>(() => {
    if (!widgetDeleteState) return null
    const { sectionIndex, widgetId } = widgetDeleteState
    const section = sections[sectionIndex]
    return section?.widgets?.find((w) => w.id === widgetId) ?? null
  }, [widgetDeleteState, sections])

  return {
    widgetFormState,
    onAddWidget,
    onEditWidget,
    onDeleteWidgetClick,
    onDeleteWidgetConfirm,
    onCancelDeleteWidget,
    onCloseWidgetForm,
    onWidgetFormSubmit,
    widgetFormInitialData,
    deletingWidget,
  }
}
