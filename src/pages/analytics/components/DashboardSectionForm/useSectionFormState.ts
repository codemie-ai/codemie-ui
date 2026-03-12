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

import type { AnalyticsDashboardItem, AnalyticsSectionItem } from '@/types/analytics'

interface SectionFormState {
  visible: boolean
  editingSectionIndex: number | null
}

interface UseSectionFormStateOptions {
  sections: AnalyticsSectionItem[]
  setValue: UseFormSetValue<AnalyticsDashboardItem>
}

export interface UseSectionFormStateReturn {
  sectionFormState: SectionFormState
  sectionFormInitialTitle: string
  deletingSection: AnalyticsDashboardItem['sections'][number] | null

  onAddSection: () => void
  onEditSection: (sectionIndex: number) => void
  onCloseSectionForm: () => void
  onSectionFormSubmit: (newTitle: string) => void

  onDeleteSectionClick: (sectionIndex: number) => void
  onDeleteSectionConfirm: () => void
  onCancelDeleteSection: () => void
}

/**
 * Custom hook to manage section form state (add/edit modal)
 * Handles adding, editing, and deleting sections
 */
export const useSectionFormState = ({
  sections,
  setValue,
}: UseSectionFormStateOptions): UseSectionFormStateReturn => {
  const [deletingSectionIndex, setDeletingSectionIndex] = useState<number | null>(null)
  const [sectionFormState, setSectionFormState] = useState<SectionFormState>({
    visible: false,
    editingSectionIndex: null,
  })

  const onAddSection = useCallback(() => {
    setSectionFormState({
      visible: true,
      editingSectionIndex: null,
    })
  }, [])

  const onEditSection = useCallback((sectionIndex: number) => {
    setSectionFormState({
      visible: true,
      editingSectionIndex: sectionIndex,
    })
  }, [])

  const onDeleteSectionClick = useCallback((sectionIndex: number) => {
    setDeletingSectionIndex(sectionIndex)
  }, [])

  const onDeleteSectionConfirm = useCallback(() => {
    if (deletingSectionIndex !== null) {
      const updatedSections = sections.filter((_, index) => index !== deletingSectionIndex)
      setValue('sections', updatedSections)
      setDeletingSectionIndex(null)
    }
  }, [deletingSectionIndex, sections])

  const onCancelDeleteSection = useCallback(() => {
    setDeletingSectionIndex(null)
  }, [])

  const onCloseSectionForm = useCallback(() => {
    setSectionFormState({
      visible: false,
      editingSectionIndex: null,
    })
  }, [])

  const generateId = () => crypto.randomUUID()

  const onSectionFormSubmit = useCallback(
    (newTitle: string) => {
      const { editingSectionIndex } = sectionFormState

      if (editingSectionIndex === null) {
        const newSection = { id: generateId(), name: newTitle, widgets: [] }
        setValue('sections', [...sections, newSection])
      } else {
        setValue(`sections.${editingSectionIndex}.name`, newTitle)
      }
    },
    [sectionFormState, sections, setValue]
  )

  const sectionFormInitialTitle = useMemo(() => {
    const { editingSectionIndex } = sectionFormState
    if (editingSectionIndex === null) return ''
    return sections[editingSectionIndex]?.name ?? ''
  }, [sectionFormState, sections])

  const deletingSection = useMemo(() => {
    if (deletingSectionIndex === null) return null
    return sections[deletingSectionIndex] ?? null
  }, [deletingSectionIndex, sections])

  return {
    sectionFormState,
    sectionFormInitialTitle,
    deletingSection,

    onAddSection,
    onEditSection,
    onCloseSectionForm,
    onSectionFormSubmit,

    onDeleteSectionClick,
    onDeleteSectionConfirm,
    onCancelDeleteSection,
  }
}
