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
import { useEffect, useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import * as Yup from 'yup'

import Input from '@/components/form/Input'
import Textarea from '@/components/form/Textarea'
import Popup from '@/components/Popup'
import { CostCenterDetail } from '@/types/entity/costCenter'

interface CostCenterFormValues {
  name: string
  description: string
}

interface CostCenterFormPopupProps {
  visible: boolean
  mode: 'create' | 'edit'
  costCenter?: CostCenterDetail | null
  onClose: () => void
  onSubmit: (payload: { name: string; description?: string }) => Promise<void>
}

interface ApiError {
  parsedError?: {
    message?: string
  }
}

const COST_CENTER_NAME_REGEX = /^[a-z0-9]+-[a-z0-9]+$/
const COST_CENTER_NAME_HINT = "Use lowercase letters or digits with exactly one '-' separator"

const validationSchema = Yup.object({
  name: Yup.string()
    .required('Cost center name is required')
    .matches(COST_CENTER_NAME_REGEX, COST_CENTER_NAME_HINT),
  description: Yup.string().default(''),
})

const CostCenterFormPopup = ({
  visible,
  mode,
  costCenter,
  onClose,
  onSubmit,
}: CostCenterFormPopupProps) => {
  const [submitError, setSubmitError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<CostCenterFormValues>({
    resolver: yupResolver(validationSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      description: '',
    },
  })

  useEffect(() => {
    if (!visible) return

    reset({
      name: costCenter?.name ?? '',
      description: costCenter?.description ?? '',
    })
    setSubmitError('')
  }, [costCenter, reset, visible])

  const submitForm: SubmitHandler<CostCenterFormValues> = async (values) => {
    setIsSubmitting(true)
    setSubmitError('')

    try {
      await onSubmit({
        name: values.name.trim(),
        description: values.description.trim() || undefined,
      })
      onClose()
    } catch (error) {
      const apiError = error as ApiError
      setSubmitError(apiError.parsedError?.message ?? 'Failed to save cost center')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Popup
      header={mode === 'create' ? 'Create cost center' : 'Edit cost center'}
      visible={visible}
      onHide={onClose}
      onSubmit={handleSubmit(submitForm)}
      submitText={mode === 'create' ? 'Create' : 'Save'}
      submitDisabled={isSubmitting || (mode === 'edit' && !isDirty)}
      limitWidth
      withBorderBottom={false}
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(submitForm)}>
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <Input
              {...field}
              label="Cost center name:"
              placeholder="eng-ops123"
              error={fieldState.error?.message}
              hint={COST_CENTER_NAME_HINT}
              disabled={mode === 'edit'}
            />
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field, fieldState }) => (
            <Textarea
              {...field}
              label="Description:"
              placeholder="Describe how this cost center is used"
              error={fieldState.error?.message}
              rows={4}
            />
          )}
        />

        {submitError ? <div className="text-sm text-text-error">{submitError}</div> : null}
      </form>
    </Popup>
  )
}

export default CostCenterFormPopup
