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

import type { AnalyticsSectionItem } from '@/types/analytics'

import { useSectionFormState } from '../useSectionFormState'

describe('useSectionFormState', () => {
  const mockSetValue = vi.fn()

  const mockSections: AnalyticsSectionItem[] = [
    { id: '1', name: 'Section 1', widgets: [] },
    { id: '2', name: 'Section 2', widgets: [] },
    { id: '3', name: 'Section 3', widgets: [] },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial state', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() =>
        useSectionFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      expect(result.current.sectionFormState).toEqual({
        visible: false,
        editingSectionIndex: null,
      })
      expect(result.current.sectionFormInitialTitle).toBe('')
      expect(result.current.deletingSection).toBeNull()
    })

    it('works with empty sections array', () => {
      const { result } = renderHook(() =>
        useSectionFormState({
          sections: [],
          setValue: mockSetValue,
        })
      )

      expect(result.current.sectionFormState).toEqual({
        visible: false,
        editingSectionIndex: null,
      })
      expect(result.current.sectionFormInitialTitle).toBe('')
      expect(result.current.deletingSection).toBeNull()
    })
  })

  describe('onAddSection', () => {
    it('opens form in add mode', () => {
      const { result } = renderHook(() =>
        useSectionFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onAddSection()
      })

      expect(result.current.sectionFormState).toEqual({
        visible: true,
        editingSectionIndex: null,
      })
    })

    it('does not change sections array', () => {
      const { result } = renderHook(() =>
        useSectionFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onAddSection()
      })

      expect(mockSetValue).not.toHaveBeenCalled()
    })

    it('resets editing index to null', () => {
      const { result } = renderHook(() =>
        useSectionFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      // First set editing mode
      act(() => {
        result.current.onEditSection(1)
      })

      // Then switch to add mode
      act(() => {
        result.current.onAddSection()
      })

      expect(result.current.sectionFormState.editingSectionIndex).toBeNull()
    })
  })

  describe('onEditSection', () => {
    it('opens form in edit mode with correct index', () => {
      const { result } = renderHook(() =>
        useSectionFormState({
          sections: mockSections,
          setValue: mockSetValue,
        })
      )

      act(() => {
        result.current.onEditSection(1)
      })

      expect(result.current.sectionFormState).toEqual({
        visible: true,
        editingSectionIndex: 1,
      })
    })

    describe('onCloseSectionForm', () => {
      it('closes form and resets state', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        // Open form first
        act(() => {
          result.current.onAddSection()
        })

        // Then close
        act(() => {
          result.current.onCloseSectionForm()
        })

        expect(result.current.sectionFormState).toEqual({
          visible: false,
          editingSectionIndex: null,
        })
      })

      it('closes form when in edit mode', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onEditSection(1)
        })

        act(() => {
          result.current.onCloseSectionForm()
        })

        expect(result.current.sectionFormState).toEqual({
          visible: false,
          editingSectionIndex: null,
        })
      })
    })

    describe('onSectionFormSubmit', () => {
      it('adds new section when not editing', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onAddSection()
        })

        act(() => {
          result.current.onSectionFormSubmit('New Section')
        })

        expect(mockSetValue).toHaveBeenCalledWith('sections', [
          ...mockSections,
          expect.objectContaining({
            id: expect.any(String),
            name: 'New Section',
            widgets: [],
          }),
        ])
      })

      it('generates valid ID for new section', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onAddSection()
        })

        act(() => {
          result.current.onSectionFormSubmit('Section A')
        })

        const firstCall = mockSetValue.mock.calls[0]
        const firstSections = firstCall[1]
        const firstId = firstSections[firstSections.length - 1].id

        expect(firstId).toBeDefined()
        expect(typeof firstId).toBe('string')
        expect(firstId.length).toBeGreaterThan(0)
      })

      it('updates existing section when editing', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onEditSection(1)
        })

        act(() => {
          result.current.onSectionFormSubmit('Updated Section')
        })

        expect(mockSetValue).toHaveBeenCalledWith('sections.1.name', 'Updated Section')
      })
    })

    describe('sectionFormInitialTitle', () => {
      it('returns empty string when adding new section', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onAddSection()
        })

        expect(result.current.sectionFormInitialTitle).toBe('')
      })

      it('returns section name when editing', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onEditSection(1)
        })

        expect(result.current.sectionFormInitialTitle).toBe('Section 2')
      })

      it('returns empty string when editing invalid index', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onEditSection(999)
        })

        expect(result.current.sectionFormInitialTitle).toBe('')
      })

      it('returns empty string when form is closed', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        expect(result.current.sectionFormInitialTitle).toBe('')
      })

      it('updates when editing different sections', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onEditSection(0)
        })

        expect(result.current.sectionFormInitialTitle).toBe('Section 1')

        act(() => {
          result.current.onEditSection(2)
        })

        expect(result.current.sectionFormInitialTitle).toBe('Section 3')
      })
    })

    describe('onDeleteSectionClick', () => {
      it('sets deleting section index', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onDeleteSectionClick(1)
        })

        expect(result.current.deletingSection).toEqual(mockSections[1])
      })

      it('handles index 0', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onDeleteSectionClick(0)
        })

        expect(result.current.deletingSection).toEqual(mockSections[0])
      })
    })

    describe('onDeleteSectionConfirm', () => {
      it('deletes section and calls setValue', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onDeleteSectionClick(1)
        })

        act(() => {
          result.current.onDeleteSectionConfirm()
        })

        expect(mockSetValue).toHaveBeenCalledWith('sections', [mockSections[0], mockSections[2]])
      })

      it('deletes first section', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onDeleteSectionClick(0)
        })

        act(() => {
          result.current.onDeleteSectionConfirm()
        })

        expect(mockSetValue).toHaveBeenCalledWith('sections', [mockSections[1], mockSections[2]])
      })

      it('deletes last section', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onDeleteSectionClick(2)
        })

        act(() => {
          result.current.onDeleteSectionConfirm()
        })

        expect(mockSetValue).toHaveBeenCalledWith('sections', [mockSections[0], mockSections[1]])
      })

      it('resets deleting section index after deletion', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onDeleteSectionClick(1)
        })

        act(() => {
          result.current.onDeleteSectionConfirm()
        })

        expect(result.current.deletingSection).toBeNull()
      })

      it('does not call setValue when deletingSectionIndex is null', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onDeleteSectionConfirm()
        })

        expect(mockSetValue).not.toHaveBeenCalled()
      })
    })

    describe('onCancelDeleteSection', () => {
      it('resets deleting section index', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onDeleteSectionClick(1)
        })

        act(() => {
          result.current.onCancelDeleteSection()
        })

        expect(result.current.deletingSection).toBeNull()
      })

      it('does not call setValue', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onDeleteSectionClick(1)
        })

        act(() => {
          result.current.onCancelDeleteSection()
        })

        expect(mockSetValue).not.toHaveBeenCalled()
      })
    })

    describe('deletingSection', () => {
      it('returns null when no section is being deleted', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        expect(result.current.deletingSection).toBeNull()
      })

      it('returns correct section when deleting', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onDeleteSectionClick(1)
        })

        expect(result.current.deletingSection).toEqual(mockSections[1])
      })

      it('returns null for invalid index', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onDeleteSectionClick(999)
        })

        expect(result.current.deletingSection).toBeNull()
      })

      it('returns null after canceling delete', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onDeleteSectionClick(1)
        })

        act(() => {
          result.current.onCancelDeleteSection()
        })

        expect(result.current.deletingSection).toBeNull()
      })
    })

    describe('Edge cases', () => {
      it('handles empty sections array in add mode', () => {
        const { result } = renderHook(() =>
          useSectionFormState({
            sections: [],
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onAddSection()
        })

        act(() => {
          result.current.onSectionFormSubmit('First Section')
        })

        expect(mockSetValue).toHaveBeenCalledWith('sections', [
          expect.objectContaining({
            name: 'First Section',
          }),
        ])
      })

      it('maintains widgets when updating section name', () => {
        const sectionsWithWidgets: AnalyticsSectionItem[] = [
          {
            id: '1',
            name: 'Section 1',
            widgets: [
              {
                id: 'w1',
                title: 'Widget 1',
                size: 'small',
                type: 'table',
                dataSourceId: 'ds1',
              } as any,
            ],
          },
        ]

        const { result } = renderHook(() =>
          useSectionFormState({
            sections: sectionsWithWidgets,
            setValue: mockSetValue,
          })
        )

        act(() => {
          result.current.onEditSection(0)
        })

        act(() => {
          result.current.onSectionFormSubmit('Updated Name')
        })

        expect(mockSetValue).toHaveBeenCalledWith('sections.0.name', 'Updated Name')
      })
    })

    describe('Callback stability', () => {
      it('maintains callback references between re-renders', () => {
        const { result, rerender } = renderHook(() =>
          useSectionFormState({
            sections: mockSections,
            setValue: mockSetValue,
          })
        )

        const firstCallbacks = {
          onAddSection: result.current.onAddSection,
          onEditSection: result.current.onEditSection,
          onCloseSectionForm: result.current.onCloseSectionForm,
          onDeleteSectionClick: result.current.onDeleteSectionClick,
          onCancelDeleteSection: result.current.onCancelDeleteSection,
        }

        rerender()

        expect(result.current.onAddSection).toBe(firstCallbacks.onAddSection)
        expect(result.current.onEditSection).toBe(firstCallbacks.onEditSection)
        expect(result.current.onCloseSectionForm).toBe(firstCallbacks.onCloseSectionForm)
        expect(result.current.onDeleteSectionClick).toBe(firstCallbacks.onDeleteSectionClick)
        expect(result.current.onCancelDeleteSection).toBe(firstCallbacks.onCancelDeleteSection)
      })

      it('updates onSectionFormSubmit callback when sections change', () => {
        const { result, rerender } = renderHook(
          ({ sections }) =>
            useSectionFormState({
              sections,
              setValue: mockSetValue,
            }),
          { initialProps: { sections: mockSections } }
        )

        const firstCallback = result.current.onSectionFormSubmit

        // Change sections
        rerender({ sections: [...mockSections, { id: '4', name: 'Section 4', widgets: [] }] })

        // Callback reference should change due to dependency
        expect(result.current.onSectionFormSubmit).not.toBe(firstCallback)
      })
    })
  })
})
