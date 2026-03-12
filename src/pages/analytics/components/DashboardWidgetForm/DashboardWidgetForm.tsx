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

import EyeSvg from '@/assets/icons/eye.svg?react'
import Button from '@/components/Button'
import { Checkbox } from '@/components/form/Checkbox'
import Input from '@/components/form/Input'
import RadioGroup from '@/components/form/RadioGroup/RadioGroup'
import Select from '@/components/form/Select'
import Textarea from '@/components/form/Textarea'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import {
  AnalyticsWidgetItem,
  OverviewMetricType,
  TabularMetricType,
  WidgetSize,
  WidgetType,
} from '@/types/analytics'

import WidgetPreviewModal from '../WidgetPreviewModal'
import { WIDGET_FORM_DEFAULTS } from './constants'
import {
  METRIC_TYPE_OPTIONS,
  OVERVIEW_WIDGET_OPTIONS,
  TABULAR_WIDGET_OPTIONS,
} from '../DashboardForm/constants'
import { useOverviewMetrics } from '../DashboardForm/useOverviewMetrics'
import { useTabularMetrics } from '../DashboardForm/useTabularMetrics'

const checkIsChartWidget = (
  widgetType?: WidgetType
): widgetType is WidgetType.DONUT | WidgetType.PIE | WidgetType.BAR =>
  [WidgetType.DONUT, WidgetType.PIE, WidgetType.BAR].includes(widgetType as WidgetType)

const checkIsOverviewMetric = (
  metricType: TabularMetricType | OverviewMetricType
): metricType is OverviewMetricType =>
  Object.values(OverviewMetricType).includes(metricType as OverviewMetricType)

export const widgetFormSchema = Yup.object().shape({
  title: Yup.string().required('Required field').max(100, 'Title must be at most 100 characters'),
  description: Yup.string().max(200, 'Description must be at most 200 characters'),
  metricType: Yup.string().required('Required field'),
  widgetType: Yup.string().required('Required field'),
  size: Yup.string().oneOf([WidgetSize.FULL, WidgetSize.HALF]).required('Required field'),

  // Overview widget-specific settings
  selectedMetrics: Yup.array(),

  // Chart-specific settings (conditional validation)
  valueField: Yup.string().when(['widgetType'], {
    is: (widgetType: string) =>
      [WidgetType.DONUT, WidgetType.PIE, WidgetType.BAR].includes(widgetType as WidgetType),
    then: (schema) => schema.required('Required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  labelField: Yup.string().when(['widgetType'], {
    is: (widgetType: string) =>
      [WidgetType.DONUT, WidgetType.PIE, WidgetType.BAR].includes(widgetType as WidgetType),
    then: (schema) => schema.required('Required'),
    otherwise: (schema) => schema.notRequired(),
  }),

  // Bar chart-specific settings
  yAxisInteger: Yup.boolean(),

  // Ratio widget-specific settings
  currentValueField: Yup.string().when(['widgetType'], {
    is: WidgetType.RATIO,
    then: (schema) => schema.required('Required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  limitValueField: Yup.string().when(['widgetType'], {
    is: WidgetType.RATIO,
    then: (schema) => schema.required('Required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  dangerThreshold: Yup.number().min(0).max(100),
  warningThreshold: Yup.number().min(0).max(100),
})

export type AnalyticsWidgetFormSchema = Yup.InferType<typeof widgetFormSchema>

interface DashboardWidgetFormProps {
  visible: boolean
  initialData?: AnalyticsWidgetFormSchema | null
  onClose: () => void
  onSubmit: (data: AnalyticsWidgetFormSchema) => void
}

const DashboardWidgetForm: FC<DashboardWidgetFormProps> = ({
  visible,
  initialData: propsInitialData,
  onClose,
  onSubmit,
}) => {
  const isEditMode = !!propsInitialData
  const initialData: AnalyticsWidgetFormSchema = useMemo(() => {
    const d = propsInitialData

    return {
      title: d?.title ?? '',
      description: d?.description ?? '',
      metricType: d?.metricType ?? '',
      widgetType: d?.widgetType ?? '',
      size: d?.size ?? WIDGET_FORM_DEFAULTS.size,
      selectedMetrics: d?.selectedMetrics ?? [],
      valueField: d?.valueField ?? '',
      labelField: d?.labelField ?? '',
      yAxisInteger: d?.yAxisInteger ?? WIDGET_FORM_DEFAULTS.yAxisInteger,
      currentValueField: d?.currentValueField ?? '',
      limitValueField: d?.limitValueField ?? '',
      dangerThreshold: d?.dangerThreshold ?? WIDGET_FORM_DEFAULTS.dangerThreshold,
      warningThreshold: d?.warningThreshold ?? WIDGET_FORM_DEFAULTS.warningThreshold,
    }
  }, [propsInitialData])

  const {
    control,
    reset,
    handleSubmit,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<AnalyticsWidgetFormSchema>({
    resolver: yupResolver(widgetFormSchema) as any,
    mode: 'all',
    defaultValues: initialData,
  })

  const { metricType, widgetType } = useWatch({ control })

  const isOverviewMetric = checkIsOverviewMetric(metricType as TabularMetricType)

  const availableWidgetTypes = useMemo(() => {
    if (!metricType) {
      return []
    }
    return isOverviewMetric ? OVERVIEW_WIDGET_OPTIONS : TABULAR_WIDGET_OPTIONS
  }, [metricType, isOverviewMetric])

  const isChartWidget = checkIsChartWidget(widgetType as WidgetType)
  const isBarChart = widgetType === WidgetType.BAR
  const isRatioWidget = widgetType === WidgetType.RATIO
  // const isOverviewWidget = widgetType === WidgetType.OVERVIEW

  const {
    numericColumns,
    stringColumns,
    loading: tabularMetricsLoading,
  } = useTabularMetrics(
    isChartWidget && !isOverviewMetric ? (metricType as TabularMetricType) : null
  )

  const {
    // metrics: overviewMetrics,
    numericMetrics: overviewNumericMetrics,
    loading: overviewMetricsLoading,
  } = useOverviewMetrics(isOverviewMetric ? (metricType as OverviewMetricType) : null)

  const handleFormSubmit = async (data: AnalyticsWidgetFormSchema) => {
    onSubmit(data)
    onClose()
  }

  const handleWidgetTypeChange = (newWidgetType: WidgetType) => {
    if (newWidgetType !== WidgetType.OVERVIEW) {
      setValue('selectedMetrics', [])
    }

    if (!checkIsChartWidget(newWidgetType)) {
      setValue('valueField', '')
      setValue('labelField', '')
    }

    if (newWidgetType !== WidgetType.BAR) {
      setValue('yAxisInteger', WIDGET_FORM_DEFAULTS.yAxisInteger)
    }

    if (newWidgetType !== WidgetType.RATIO) {
      setValue('currentValueField', '')
      setValue('limitValueField', '')
      setValue('dangerThreshold', WIDGET_FORM_DEFAULTS.dangerThreshold)
      setValue('warningThreshold', WIDGET_FORM_DEFAULTS.warningThreshold)
    }
  }

  const handleMetricTypeChange = (newMetricType: OverviewMetricType | TabularMetricType) => {
    const currentWidgetType = getValues('widgetType')
    const newIsOverviewMetric = checkIsOverviewMetric(newMetricType)

    const newAvailableWidgetTypes = newIsOverviewMetric
      ? OVERVIEW_WIDGET_OPTIONS
      : TABULAR_WIDGET_OPTIONS

    const isCurrentWidgetTypeAvailable = newAvailableWidgetTypes.some(
      (option) => option.value === currentWidgetType
    )

    if (currentWidgetType && !isCurrentWidgetTypeAvailable) {
      setValue('widgetType', '')
    }

    setValue('selectedMetrics', [])
    setValue('valueField', '')
    setValue('labelField', '')
    setValue('yAxisInteger', WIDGET_FORM_DEFAULTS.yAxisInteger)
    setValue('currentValueField', '')
    setValue('limitValueField', '')
    setValue('dangerThreshold', WIDGET_FORM_DEFAULTS.dangerThreshold)
    setValue('warningThreshold', WIDGET_FORM_DEFAULTS.warningThreshold)
  }

  const handleCancel = () => {
    onClose()
  }

  const [headerText, setHeaderText] = useState('')
  const [submitButtonText, setSubmitButtonText] = useState('')
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewWidgetData, setPreviewWidgetData] = useState<AnalyticsWidgetItem | null>(null)

  useEffect(() => {
    if (visible) {
      setHeaderText(isEditMode ? 'Edit Widget' : 'Add Widget')
      setSubmitButtonText(isEditMode ? 'Update Widget' : 'Add Widget')
      reset(initialData)
    }
  }, [visible, isEditMode, initialData])

  const handlePreview = useCallback(async () => {
    const isValid = await trigger()
    if (!isValid) return

    const formValues = getValues()

    const widget = { ...formValues, id: 'preview-widget' } as AnalyticsWidgetItem
    setPreviewWidgetData(widget)
    setPreviewVisible(true)
  }, [])

  const footerContent = useMemo(
    () => (
      <div className="flex items-center justify-between w-full">
        <Button variant={ButtonType.SECONDARY} onClick={handleCancel}>
          Cancel
        </Button>
        <div className="flex gap-3">
          <Button variant={ButtonType.SECONDARY} onClick={handlePreview}>
            <EyeSvg className="size-4" />
            Preview
          </Button>
          <Button variant={ButtonType.PRIMARY} onClick={handleSubmit(handleFormSubmit)}>
            {submitButtonText}
          </Button>
        </div>
      </div>
    ),
    [handleCancel, handlePreview, handleFormSubmit, submitButtonText]
  )

  return (
    <>
      <Popup
        dismissableMask={false}
        visible={visible}
        withBorderBottom={false}
        className="w-full max-w-lg"
        header={headerText}
        onHide={handleCancel}
        footerContent={footerContent}
      >
        <form className="flex flex-col gap-4">
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                label="Title"
                placeholder="Title"
                error={errors.title?.message}
                required
              />
            )}
          />

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                label="Description"
                placeholder="Description"
                error={errors.description?.message}
                rows={3}
              />
            )}
          />

          <Controller
            name="metricType"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                required
                label="Metric Type"
                placeholder="Metric type"
                options={METRIC_TYPE_OPTIONS}
                error={errors.metricType?.message}
                onChange={(e) => {
                  handleMetricTypeChange(e.value)
                  field.onChange(e)
                }}
              />
            )}
          />

          <Controller
            name="widgetType"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                required
                label="Widget Type"
                placeholder="Widget type"
                options={availableWidgetTypes}
                error={errors.widgetType?.message}
                disabled={!metricType}
                onChange={(e) => {
                  handleWidgetTypeChange(e.value)
                  field.onChange(e)
                }}
              />
            )}
          />

          <Controller
            name="size"
            control={control}
            render={({ field }) => (
              <RadioGroup
                name="size"
                label="Widget Size"
                value={field.value}
                onChange={field.onChange}
                options={[
                  { label: 'Full Width', value: WidgetSize.FULL },
                  { label: 'Half Width', value: WidgetSize.HALF },
                ]}
              />
            )}
          />

          {/* Chart-specific settings */}
          {isChartWidget && (
            <>
              <Controller
                name="valueField"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    label="Value Field"
                    placeholder="Select value field"
                    options={numericColumns.map((col) => ({
                      label: col.label,
                      value: col.id,
                    }))}
                    error={errors.valueField?.message}
                    required
                    loading={tabularMetricsLoading}
                    disabled={tabularMetricsLoading}
                  />
                )}
              />

              <Controller
                name="labelField"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    label="Label Field"
                    placeholder="Select label field"
                    options={stringColumns.map((col) => ({
                      label: col.label,
                      value: col.id,
                    }))}
                    error={errors.labelField?.message}
                    required
                    loading={tabularMetricsLoading}
                    disabled={tabularMetricsLoading}
                  />
                )}
              />
            </>
          )}

          {/* Bar chart-specific settings */}
          {isBarChart && (
            <Controller
              name="yAxisInteger"
              control={control}
              render={({ field }) => (
                <Checkbox
                  {...field}
                  label="Show only integer values on Y-axis"
                  checked={field.value}
                />
              )}
            />
          )}

          {/* Overview widget-specific settings */}
          {/* {isOverviewWidget && (
          <Controller
            name="selectedMetrics"
            control={control}
            render={({ field }) => (
              <MultiSelect
                required
                showCheckbox
                label="Select Metrics to Display"
                placeholder="Choose metrics"
                loading={overviewMetricsLoading}
                disabled={overviewMetricsLoading}
                error={errors.selectedMetrics?.message}
                value={overviewMetrics.filter((m) => field.value?.includes(m.id)).map((m) => m.id)}
                onChange={(e) => {
                  field.onChange(e.value)
                }}
                options={overviewMetrics.map((metric) => ({
                  label: metric.label,
                  value: metric.id,
                }))}
              />
            )}
          />
        )} */}

          {/* Ratio widget-specific settings */}
          {isRatioWidget && (
            <>
              <Controller
                name="currentValueField"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    label="Current Value Field"
                    placeholder="Select current value field"
                    options={overviewNumericMetrics.map((metric) => ({
                      label: metric.label,
                      value: metric.id,
                    }))}
                    error={errors.currentValueField?.message}
                    required
                    loading={overviewMetricsLoading}
                    disabled={overviewMetricsLoading}
                  />
                )}
              />

              <Controller
                name="limitValueField"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    label="Limit Value Field"
                    placeholder="Select limit value field"
                    options={overviewNumericMetrics.map((metric) => ({
                      label: metric.label,
                      value: metric.id,
                    }))}
                    error={errors.limitValueField?.message}
                    required
                    loading={overviewMetricsLoading}
                    disabled={overviewMetricsLoading}
                  />
                )}
              />

              <div className="flex gap-2">
                <Controller
                  name="dangerThreshold"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="number"
                      label="Danger Threshold (%)"
                      placeholder="25"
                      error={errors.dangerThreshold?.message}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  )}
                />

                <Controller
                  name="warningThreshold"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="number"
                      label="Warning Threshold (%)"
                      placeholder="50"
                      error={errors.warningThreshold?.message}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  )}
                />
              </div>
            </>
          )}
        </form>
      </Popup>

      <WidgetPreviewModal
        visible={previewVisible}
        onHide={() => setPreviewVisible(false)}
        widget={previewWidgetData}
      />
    </>
  )
}

export default DashboardWidgetForm
