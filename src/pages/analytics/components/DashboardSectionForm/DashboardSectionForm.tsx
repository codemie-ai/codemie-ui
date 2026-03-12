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
import { FC, useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import * as Yup from 'yup'

import Input from '@/components/form/Input'
import Popup from '@/components/Popup'

const sectionFormSchema = Yup.object().shape({
  title: Yup.string().required('Required field').max(100, 'Title must be at most 100 characters'),
})

type SectionFormData = Yup.InferType<typeof sectionFormSchema>

interface DashboardSectionFormProps {
  visible: boolean
  onClose: () => void
  onSubmit: (title: string) => void
  initialTitle: string
}

const DashboardSectionForm: FC<DashboardSectionFormProps> = ({
  visible,
  onClose,
  onSubmit,
  initialTitle,
}) => {
  const isEditMode = initialTitle !== ''

  const initialData: SectionFormData = useMemo(() => {
    return {
      title: initialTitle ?? '',
    }
  }, [initialTitle])

  const {
    control,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SectionFormData>({
    resolver: yupResolver(sectionFormSchema) as any,
    mode: 'all',
    shouldUnregister: true,
    defaultValues: initialData,
  })

  useEffect(() => {
    reset(initialData)
  }, [initialTitle])

  const handleFormSubmit = async (data: SectionFormData) => {
    onSubmit(data.title)
    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  const headerText = isEditMode ? 'Edit Section' : 'Add New Section'
  const submitText = isEditMode ? 'Save' : 'Add Section'

  return (
    <Popup
      dismissableMask={false}
      visible={visible}
      withBorderBottom={false}
      submitDisabled={isSubmitting}
      cancelText="Cancel"
      className="w-full max-w-lg"
      header={headerText}
      submitText={submitText}
      onHide={() => handleCancel()}
      onSubmit={handleSubmit(handleFormSubmit)}
    >
      <form className="flex flex-col gap-4">
        <Controller
          name="title"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              label="Section Name"
              placeholder="Section Name"
              error={errors.title?.message}
              required
            />
          )}
        />
      </form>
    </Popup>
  )
}

export default DashboardSectionForm
