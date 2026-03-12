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
import { FC, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import * as Yup from 'yup'

import Input from '@/components/form/Input'
import Textarea from '@/components/form/Textarea'
import InfoWarning from '@/components/InfoWarning'
import Popup from '@/components/Popup'
import { InfoWarningType } from '@/constants'
import { Category } from '@/types/entity/category'

interface CategoryModalProps {
  visible: boolean
  category?: Category | null
  onHide: () => void
  onSubmit: (data: CategoryFormData) => Promise<void>
}

export interface CategoryFormData {
  name: string
  description?: string
}

const validationSchema: Yup.ObjectSchema<CategoryFormData> = Yup.object({
  name: Yup.string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .defined(),
  description: Yup.string().max(500, 'Description must be less than 500 characters').optional(),
})

const CategoryModal: FC<CategoryModalProps> = ({ visible, category, onHide, onSubmit }) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CategoryFormData>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  })

  useEffect(() => {
    if (visible && category) {
      reset({
        name: category.name,
        description: category.description || '',
      })
    } else if (visible && !category) {
      reset({
        name: '',
        description: '',
      })
    }
  }, [visible, category, reset])

  const handleFormSubmit = async (data: CategoryFormData) => {
    await onSubmit(data)
    reset()
  }

  return (
    <Popup
      visible={visible}
      onHide={onHide}
      onSubmit={handleSubmit(handleFormSubmit)}
      header={category ? 'Edit Category' : 'Create Category'}
      submitText={category ? 'Save' : 'Create'}
      submitDisabled={isSubmitting}
      cancelText="Cancel"
      limitWidth
      withBorderBottom={false}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="name"
              label="Name:"
              required
              placeholder="Category Name"
              error={errors.name?.message}
            />
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              id="description"
              label="Description:"
              placeholder="Describe what this category is for"
              rows={4}
              error={errors.description?.message}
            />
          )}
        />

        {category &&
          (category.projectAssistantCount ?? 0) + (category.marketplaceAssistantCount ?? 0) > 0 && (
            <InfoWarning
              type={InfoWarningType.WARNING}
              message="This category is used by existing assistants. Changes may affect them."
            />
          )}
      </form>
    </Popup>
  )
}

export default CategoryModal
