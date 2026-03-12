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

import { yupResolver } from '@hookform/resolvers/yup'
import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import * as Yup from 'yup'

import PlusSvg from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal/ConfirmationModal'
import Input from '@/components/form/Input'
import { ButtonType } from '@/constants'
import { FormIDs } from '@/constants/formIds'
import { useUnsavedChanges } from '@/hooks/useUnsavedChangesWarning'
import {
  AnalyticsDashboardItem,
  AnalyticsSectionItem,
  AnalyticsWidgetItem,
} from '@/types/analytics'

import DashboardOrderList from '../DashboardOrderList/DashboardOrderList'
import { SectionMethods } from '../DashboardOrderList/OrderListSection'
import { WidgetMethods } from '../DashboardOrderList/OrderListWidget'
import DashboardSectionForm from '../DashboardSectionForm/DashboardSectionForm'
import { useSectionFormState } from '../DashboardSectionForm/useSectionFormState'
import DashboardWidgetForm from '../DashboardWidgetForm/DashboardWidgetForm'
import { useWidgetFormState } from '../DashboardWidgetForm/useWidgetFormState'
import WidgetPreviewModal from '../WidgetPreviewModal'

const analyticsDashboardSchema = Yup.object().shape({
  name: Yup.string().trim().required('Required field').max(30, 'Must be at most 30 characters'),
  sections: Yup.array()
    .of(
      Yup.object().shape({
        name: Yup.string().required(),
        widgets: Yup.array(),
      })
    )
    .required(),
})

export type AnalyticsDashboardFormSchema = Yup.InferType<typeof analyticsDashboardSchema>

interface DashboardFormProps {
  formId: string
  initialData?: AnalyticsDashboardFormSchema | null
  onSubmit: (data: AnalyticsDashboardItem) => Promise<void>
}

const DashboardForm: FC<DashboardFormProps> = ({ formId, initialData, onSubmit }) => {
  const { handleSubmit, setValue, control } = useForm<AnalyticsDashboardItem>({
    mode: 'all',
    resolver: yupResolver(analyticsDashboardSchema) as any,
    defaultValues: {
      name: initialData?.name ?? '',
      sections: initialData?.sections ?? [],
    },
  })

  const { name = '', sections = [] } = useWatch({ control })

  const prepareFormData = useCallback(() => {
    return { name, sections }
  }, [name, sections])

  const { unblockTransition, blockTransition } = useUnsavedChanges({
    formId: FormIDs.DASHBOARD_FORM,
    getCurrentValues: prepareFormData,
  })

  useEffect(() => {
    blockTransition()
  }, [blockTransition])

  const handleFormSubmit = handleSubmit(async (data: AnalyticsDashboardItem) => {
    unblockTransition()
    await onSubmit(data)
  })

  const {
    widgetFormState,
    widgetFormInitialData,
    deletingWidget,

    onAddWidget,
    onEditWidget,
    onCloseWidgetForm,
    onWidgetFormSubmit,

    onDeleteWidgetClick,
    onDeleteWidgetConfirm,
    onCancelDeleteWidget,
  } = useWidgetFormState({
    sections: sections as AnalyticsSectionItem[],
    setValue,
  })

  const {
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
  } = useSectionFormState({
    sections: sections as AnalyticsSectionItem[],
    setValue,
  })

  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewWidget, setPreviewWidget] = useState<AnalyticsWidgetItem | null>(null)

  const handlePreviewWidget = useCallback(
    (sectionIndex: number, widgetId: string) => {
      const section = sections[sectionIndex]
      if (!section?.widgets) return

      const widget = section.widgets.find((w) => w.id === widgetId)
      if (!widget) return

      setPreviewWidget(widget as AnalyticsWidgetItem)
      setPreviewVisible(true)
    },
    [sections]
  )

  const widgetMethods = useMemo<WidgetMethods>(
    () => ({
      onAdd: onAddWidget,
      onEdit: onEditWidget,
      onDelete: onDeleteWidgetClick,
      onPreview: handlePreviewWidget,
    }),
    [onAddWidget, onEditWidget, onDeleteWidgetClick, handlePreviewWidget]
  )

  const sectionMethods = useMemo<SectionMethods>(
    () => ({
      onEdit: onEditSection,
      onDelete: onDeleteSectionClick,
    }),
    [onEditSection, onDeleteSectionClick]
  )

  const getDeleteSectionMessage = () => {
    if (!deletingSection) return ''
    if (deletingSection.widgets.length === 0) {
      return `Are you sure you want to delete "${deletingSection.name}" section?`
    }
    const widgetCount = deletingSection.widgets.length
    return `Are you sure you want to delete "${
      deletingSection.name
    }" section? This will also delete ${widgetCount} widget${widgetCount > 1 ? 's' : ''}.`
  }

  const deleteWidgetMessage = deletingWidget
    ? `Are you sure you want to delete "${deletingWidget.title}" widget?`
    : ''

  return (
    <>
      <form id={formId} onSubmit={handleFormSubmit} className="mx-auto py-8 px-6" noValidate>
        <div className="mb-6">
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                required
                label="Dashboard Name"
                placeholder="Dashboard Name"
                error={fieldState.error?.message}
                {...field}
              />
            )}
          />
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold mb-0">Sections</h2>
          <Button variant="primary" onClick={onAddSection}>
            <PlusSvg />
            Add New Section
          </Button>
        </div>

        <DashboardOrderList
          sections={sections as AnalyticsSectionItem[]}
          onChange={(s) => setValue('sections', s)}
          widgetMethods={widgetMethods}
          sectionMethods={sectionMethods}
        />
      </form>

      <DashboardWidgetForm
        visible={widgetFormState.visible}
        onClose={onCloseWidgetForm}
        onSubmit={onWidgetFormSubmit}
        initialData={widgetFormInitialData}
      />

      <DashboardSectionForm
        visible={sectionFormState.visible}
        onClose={onCloseSectionForm}
        onSubmit={onSectionFormSubmit}
        initialTitle={sectionFormInitialTitle}
      />

      <ConfirmationModal
        visible={deletingSection !== null}
        header="Delete Section"
        message={getDeleteSectionMessage()}
        confirmText="Delete"
        className="max-w-lg w-full"
        confirmButtonType={ButtonType.DELETE}
        onCancel={onCancelDeleteSection}
        onConfirm={onDeleteSectionConfirm}
      />

      <ConfirmationModal
        visible={deletingWidget !== null}
        header="Delete Widget"
        message={deleteWidgetMessage}
        confirmText="Delete"
        className="max-w-lg w-full"
        confirmButtonType={ButtonType.DELETE}
        onCancel={onCancelDeleteWidget}
        onConfirm={onDeleteWidgetConfirm}
      />

      <WidgetPreviewModal
        visible={previewVisible}
        widget={previewWidget}
        onHide={() => setPreviewVisible(false)}
      />
    </>
  )
}

export default DashboardForm
