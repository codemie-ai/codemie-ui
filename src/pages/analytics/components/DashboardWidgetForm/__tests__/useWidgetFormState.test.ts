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

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { AnalyticsSectionItem, AnalyticsWidgetItem } from '@/types/analytics'

import { AnalyticsWidgetFormSchema } from '../DashboardWidgetForm'
import { useWidgetFormState } from '../useWidgetFormState'

describe('useWidgetFormState', () => {
  const mockSetValue = vi.fn()

  const mockWidget1: AnalyticsWidgetItem = {
    id: 'w1',
    title: 'Widget 1',
    description: 'Description 1',
    size: 'small',
    type: 'table',
    dataSourceId: 'ds1',
  } as any

  const mockWidget2: AnalyticsWidgetItem = {
    id: 'w2',
    title: 'Widget 2',
    size: 'medium',
    type: 'pie-chart',
    dataSourceId: 'ds2',
  } as any

  const mockSections: AnalyticsSectionItem[] = [
    {
      id: 's1',
      name: 'Section 1',
      widgets: [mockWidget1, mockWidget2],
    },
    {
      id: 's2',
      name: 'Section 2',
      widgets: [],
    },
    {
      id: 's3',
      name: 'Section 3',
      widgets: [
        {
          id: 'w3',
          title: 'Widget 3',
          size: 'large',
          type: 'bar-chart',
          dataSourceId: 'ds3',
        } as any,
      ],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial state', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      expect(result.current.widgetFormState).toEqual({
        visible: false,
        sectionIndex: null,
        editingWidgetId: null,
      })
      expect(result.current.widgetFormInitialData).toBeNull()
      expect(result.current.deletingWidget).toBeNull()
    })

    it('works with empty sections array', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: [],
          setValue: mockSetValue,
        })
      )

      expect(result.current.widgetFormState).toEqual({
        visible: false,
        sectionIndex: null,
        editingWidgetId: null,
      })
      expect(result.current.widgetFormInitialData).toBeNull()
      expect(result.current.deletingWidget).toBeNull()
    })
  })

  describe('onAddWidget', () => {
    it('opens form in add mode for section', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onAddWidget(0)
      })

      expect(result.current.widgetFormState).toEqual({
        visible: true,
        sectionIndex: 0,
        editingWidgetId: null,
      })
    })

    it('resets editing widget ID when adding', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      // First edit a widget
      act(() => {
        result.current.onEditWidget(0, 'w1')
      })

      // Then switch to add mode
      act(() => {
        result.current.onAddWidget(1)
      })

      expect(result.current.widgetFormState.editingWidgetId).toBeNull()
    })

    it('does not call setValue', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onAddWidget(0)
      })

      expect(mockSetValue).not.toHaveBeenCalled()
    })
  })

  describe('onEditWidget', () => {
    it('opens form in edit mode with correct section and widget', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onEditWidget(0, 'w1')
      })

      expect(result.current.widgetFormState).toEqual({
        visible: true,
        sectionIndex: 0,
        editingWidgetId: 'w1',
      })
    })

    it('handles editing widget in different section', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onEditWidget(2, 'w3')
      })

      expect(result.current.widgetFormState).toEqual({
        visible: true,
        sectionIndex: 2,
        editingWidgetId: 'w3',
      })
    })
  })

  describe('onCloseWidgetForm', () => {
    it('closes form and resets state', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onAddWidget(0)
      })

      act(() => {
        result.current.onCloseWidgetForm()
      })

      expect(result.current.widgetFormState).toEqual({
        visible: false,
        sectionIndex: null,
        editingWidgetId: null,
      })
    })

    it('closes form when in edit mode', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onEditWidget(0, 'w1')
      })

      act(() => {
        result.current.onCloseWidgetForm()
      })

      expect(result.current.widgetFormState).toEqual({
        visible: false,
        sectionIndex: null,
        editingWidgetId: null,
      })
    })
  })

  describe('onWidgetFormSubmit', () => {
    const newWidgetData: AnalyticsWidgetFormSchema = {
      title: 'New Widget',
      description: 'New Description',
      size: 'medium',
      type: 'table',
      dataSourceId: 'ds-new',
    } as any

    it('adds new widget when not editing', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onAddWidget(0)
      })

      act(() => {
        result.current.onWidgetFormSubmit(newWidgetData)
      })

      expect(mockSetValue).toHaveBeenCalledWith('sections.0.widgets', [
        mockWidget1,
        mockWidget2,
        expect.objectContaining({
          id: expect.any(String),
          ...newWidgetData,
        }),
      ])
    })

    it('adds widget to empty widgets array', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onAddWidget(1) // Section 2 has no widgets
      })

      act(() => {
        result.current.onWidgetFormSubmit(newWidgetData)
      })

      expect(mockSetValue).toHaveBeenCalledWith('sections.1.widgets', [
        expect.objectContaining({
          id: expect.any(String),
          ...newWidgetData,
        }),
      ])
    })

    it('generates valid ID for new widget', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onAddWidget(1)
      })

      act(() => {
        result.current.onWidgetFormSubmit(newWidgetData)
      })

      const firstCall = mockSetValue.mock.calls[0]
      const firstWidgets = firstCall[1]
      const firstId = firstWidgets[firstWidgets.length - 1].id

      expect(firstId).toBeDefined()
      expect(typeof firstId).toBe('string')
      expect(firstId.length).toBeGreaterThan(0)
    })

    it('updates existing widget when editing', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onEditWidget(0, 'w1')
      })

      const updatedData: AnalyticsWidgetFormSchema = {
        title: 'Updated Widget',
        description: 'Updated Description',
        size: 'large',
        type: 'bar-chart',
        dataSourceId: 'ds-updated',
      } as any

      act(() => {
        result.current.onWidgetFormSubmit(updatedData)
      })

      expect(mockSetValue).toHaveBeenCalledWith('sections.0.widgets', [
        expect.objectContaining({
          id: 'w1',
          ...updatedData,
        }),
        mockWidget2,
      ])
    })

    it('preserves widget ID when editing', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onEditWidget(0, 'w2')
      })

      act(() => {
        result.current.onWidgetFormSubmit({ ...newWidgetData, title: 'Updated' })
      })

      const updatedWidgets = mockSetValue.mock.calls[0][1]
      const updatedWidget = updatedWidgets.find((w: any) => w.id === 'w2')

      expect(updatedWidget.id).toBe('w2')
    })

    it('does not call setValue when sectionIndex is null', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      // Don't open form, try to submit directly
      act(() => {
        result.current.onWidgetFormSubmit(newWidgetData)
      })

      expect(mockSetValue).not.toHaveBeenCalled()
    })

    it('handles undefined widgets array', () => {
      const sectionsWithUndefinedWidgets: AnalyticsSectionItem[] = [
        {
          id: 's1',
          name: 'Section 1',
          widgets: undefined as any,
        },
      ]

      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: sectionsWithUndefinedWidgets,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onAddWidget(0)
      })

      act(() => {
        result.current.onWidgetFormSubmit(newWidgetData)
      })

      expect(mockSetValue).toHaveBeenCalledWith('sections.0.widgets', [
        expect.objectContaining(newWidgetData),
      ])
    })
  })

  describe('widgetFormInitialData', () => {
    it('returns null when adding new widget', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onAddWidget(0)
      })

      expect(result.current.widgetFormInitialData).toBeNull()
    })

    it('returns widget data when editing', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onEditWidget(0, 'w1')
      })

      expect(result.current.widgetFormInitialData).toEqual(mockWidget1)
    })

    it('returns null when form is closed', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      expect(result.current.widgetFormInitialData).toBeNull()
    })

    it('returns null when editing non-existent widget', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onEditWidget(0, 'non-existent')
      })

      expect(result.current.widgetFormInitialData).toBeNull()
    })

    it('updates when editing different widgets', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onEditWidget(0, 'w1')
      })

      expect(result.current.widgetFormInitialData).toEqual(mockWidget1)

      act(() => {
        result.current.onEditWidget(0, 'w2')
      })

      expect(result.current.widgetFormInitialData).toEqual(mockWidget2)
    })

    it('returns null when section index is null', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      expect(result.current.widgetFormInitialData).toBeNull()
    })

    it('handles invalid section index gracefully', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onEditWidget(999, 'w1')
      })

      expect(result.current.widgetFormInitialData).toBeNull()
    })
  })

  describe('onDeleteWidgetClick', () => {
    it('sets deleting widget state', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onDeleteWidgetClick(0, 'w1')
      })

      expect(result.current.deletingWidget).toEqual(mockWidget1)
    })

    it('handles deleting from different section', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onDeleteWidgetClick(2, 'w3')
      })

      expect(result.current.deletingWidget).toEqual(mockSections[2].widgets[0])
    })

    it('allows setting non-existent widget', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onDeleteWidgetClick(0, 'non-existent')
      })

      expect(result.current.deletingWidget).toBeNull()
    })
  })

  describe('onDeleteWidgetConfirm', () => {
    it('deletes widget and calls setValue', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onDeleteWidgetClick(0, 'w1')
      })

      act(() => {
        result.current.onDeleteWidgetConfirm()
      })

      expect(mockSetValue).toHaveBeenCalledWith('sections.0.widgets', [mockWidget2])
    })

    it('deletes only widget from section', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onDeleteWidgetClick(2, 'w3')
      })

      act(() => {
        result.current.onDeleteWidgetConfirm()
      })

      expect(mockSetValue).toHaveBeenCalledWith('sections.2.widgets', [])
    })

    it('resets deleting widget state after deletion', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onDeleteWidgetClick(0, 'w1')
      })

      act(() => {
        result.current.onDeleteWidgetConfirm()
      })

      expect(result.current.deletingWidget).toBeNull()
    })

    it('does not call setValue when widgetDeleteState is null', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onDeleteWidgetConfirm()
      })

      expect(mockSetValue).not.toHaveBeenCalled()
    })

    it('deletes second widget correctly', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onDeleteWidgetClick(0, 'w2')
      })

      act(() => {
        result.current.onDeleteWidgetConfirm()
      })

      expect(mockSetValue).toHaveBeenCalledWith('sections.0.widgets', [mockWidget1])
    })
  })

  describe('onCancelDeleteWidget', () => {
    it('resets deleting widget state', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onDeleteWidgetClick(0, 'w1')
      })

      act(() => {
        result.current.onCancelDeleteWidget()
      })

      expect(result.current.deletingWidget).toBeNull()
    })

    it('does not call setValue', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onDeleteWidgetClick(0, 'w1')
      })

      act(() => {
        result.current.onCancelDeleteWidget()
      })

      expect(mockSetValue).not.toHaveBeenCalled()
    })
  })

  describe('deletingWidget', () => {
    it('returns null when no widget is being deleted', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      expect(result.current.deletingWidget).toBeNull()
    })

    it('returns correct widget when deleting', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onDeleteWidgetClick(0, 'w2')
      })

      expect(result.current.deletingWidget).toEqual(mockWidget2)
    })

    it('returns null for non-existent widget ID', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onDeleteWidgetClick(0, 'non-existent')
      })

      expect(result.current.deletingWidget).toBeNull()
    })

    it('returns null after canceling delete', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onDeleteWidgetClick(0, 'w1')
      })

      act(() => {
        result.current.onCancelDeleteWidget()
      })

      expect(result.current.deletingWidget).toBeNull()
    })
  })

  describe('Edge cases', () => {
    it('handles empty sections array gracefully', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: [],
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onAddWidget(0)
      })

      const newWidgetData: AnalyticsWidgetFormSchema = {
        title: 'Widget',
        size: 'small',
        type: 'table',
        dataSourceId: 'ds1',
      } as any

      act(() => {
        result.current.onWidgetFormSubmit(newWidgetData)
      })

      // Implementation handles undefined section by using empty widgets array
      expect(mockSetValue).toHaveBeenCalledWith('sections.0.widgets', [
        expect.objectContaining({
          title: 'Widget',
        }),
      ])
    })

    it('handles widget without description', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onEditWidget(0, 'w2')
      })

      expect(result.current.widgetFormInitialData?.description).toBeUndefined()
    })
  })

  describe('Callback stability', () => {
    it('maintains callback references between re-renders', () => {
      const { result, rerender } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      const firstCallbacks = {
        onAddWidget: result.current.onAddWidget,
        onEditWidget: result.current.onEditWidget,
        onCloseWidgetForm: result.current.onCloseWidgetForm,
        onDeleteWidgetClick: result.current.onDeleteWidgetClick,
        onCancelDeleteWidget: result.current.onCancelDeleteWidget,
      }

      rerender()

      expect(result.current.onAddWidget).toBe(firstCallbacks.onAddWidget)
      expect(result.current.onEditWidget).toBe(firstCallbacks.onEditWidget)
      expect(result.current.onCloseWidgetForm).toBe(firstCallbacks.onCloseWidgetForm)
      expect(result.current.onDeleteWidgetClick).toBe(firstCallbacks.onDeleteWidgetClick)
      expect(result.current.onCancelDeleteWidget).toBe(firstCallbacks.onCancelDeleteWidget)
    })

    it('updates onWidgetFormSubmit callback when sections change', () => {
      const { result, rerender } = renderHook(
        ({ sections }) =>
          useWidgetFormState({
            sections,
            setValue: mockSetValue,
          }),
        { initialProps: { sections: mockSections } }
      )

      const firstCallback = result.current.onWidgetFormSubmit

      // Change sections
      const newSections = [...mockSections, { id: 's4', name: 'Section 4', widgets: [] }]
      rerender({ sections: newSections })

      // Callback reference should change due to dependency
      expect(result.current.onWidgetFormSubmit).not.toBe(firstCallback)
    })

    it('updates onDeleteWidgetConfirm callback when sections change', () => {
      const { result, rerender } = renderHook(
        ({ sections }) =>
          useWidgetFormState({
            sections,
            setValue: mockSetValue,
          }),
        { initialProps: { sections: mockSections } }
      )

      const firstCallback = result.current.onDeleteWidgetConfirm

      // Change sections
      const newSections = [
        ...mockSections,
        { id: 's4', name: 'Section 4', widgets: [] as AnalyticsWidgetItem[] },
      ]
      rerender({ sections: newSections })

      // Callback reference should change due to dependency
      expect(result.current.onDeleteWidgetConfirm).not.toBe(firstCallback)
    })
  })

  describe('Complex workflows', () => {
    it('handles add, edit, delete sequence correctly', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      // Add new widget
      act(() => {
        result.current.onAddWidget(1)
      })

      const newWidget: AnalyticsWidgetFormSchema = {
        title: 'New Widget',
        size: 'small',
        type: 'table',
        dataSourceId: 'ds1',
      } as any

      act(() => {
        result.current.onWidgetFormSubmit(newWidget)
      })

      expect(mockSetValue).toHaveBeenCalledWith(
        'sections.1.widgets',
        expect.arrayContaining([expect.objectContaining({ title: 'New Widget' })])
      )

      vi.clearAllMocks()

      // Edit existing widget
      act(() => {
        result.current.onEditWidget(0, 'w1')
      })

      const updatedWidget: AnalyticsWidgetFormSchema = {
        title: 'Updated Widget',
        size: 'large',
        type: 'bar-chart',
        dataSourceId: 'ds2',
      } as any

      act(() => {
        result.current.onWidgetFormSubmit(updatedWidget)
      })

      expect(mockSetValue).toHaveBeenCalledWith(
        'sections.0.widgets',
        expect.arrayContaining([expect.objectContaining({ id: 'w1', title: 'Updated Widget' })])
      )

      vi.clearAllMocks()

      // Delete widget
      act(() => {
        result.current.onDeleteWidgetClick(0, 'w2')
      })

      act(() => {
        result.current.onDeleteWidgetConfirm()
      })

      expect(mockSetValue).toHaveBeenCalledWith('sections.0.widgets', [
        expect.objectContaining({ id: 'w1' }),
      ])
    })

    it('handles multiple add operations in sequence', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      const widget1: AnalyticsWidgetFormSchema = {
        title: 'Widget 1',
        size: 'small',
        type: 'table',
        dataSourceId: 'ds1',
      } as any

      act(() => {
        result.current.onAddWidget(1)
      })

      act(() => {
        result.current.onWidgetFormSubmit(widget1)
      })

      vi.clearAllMocks()

      const widget2: AnalyticsWidgetFormSchema = {
        title: 'Widget 2',
        size: 'medium',
        type: 'pie-chart',
        dataSourceId: 'ds2',
      } as any

      act(() => {
        result.current.onAddWidget(1)
      })

      act(() => {
        result.current.onWidgetFormSubmit(widget2)
      })

      expect(mockSetValue).toHaveBeenCalledTimes(1)
      expect(mockSetValue).toHaveBeenCalledWith(
        'sections.1.widgets',
        expect.arrayContaining([expect.objectContaining({ title: 'Widget 2' })])
      )
    })

    it('cancels delete and allows subsequent operations', () => {
      const { result } = renderHook(() =>
        useWidgetFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      // Start delete
      act(() => {
        result.current.onDeleteWidgetClick(0, 'w1')
      })

      expect(result.current.deletingWidget).toEqual(mockWidget1)

      // Cancel delete
      act(() => {
        result.current.onCancelDeleteWidget()
      })

      expect(result.current.deletingWidget).toBeNull()
      expect(mockSetValue).not.toHaveBeenCalled()

      // Add new widget after canceling delete
      act(() => {
        result.current.onAddWidget(1)
      })

      const newWidget: AnalyticsWidgetFormSchema = {
        title: 'New Widget',
        size: 'small',
        type: 'table',
        dataSourceId: 'ds1',
      } as any

      act(() => {
        result.current.onWidgetFormSubmit(newWidget)
      })

      expect(mockSetValue).toHaveBeenCalledWith(
        'sections.1.widgets',
        expect.arrayContaining([expect.objectContaining({ title: 'New Widget' })])
      )
    })
  })
})
