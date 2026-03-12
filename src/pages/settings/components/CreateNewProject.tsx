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
import React from 'react'
import { useForm, SubmitHandler, Controller } from 'react-hook-form'
import * as Yup from 'yup'

import Input from '@/components/form/Input'
import Popup from '@/components/Popup'
import { userStore } from '@/store'

interface CreateNewProjectPopupProps {
  open: boolean
  onClose?: () => void
}

interface FormValues {
  newProjectName: string
}

export const VALIDATION_ERROR_MSGS = {
  beginsWithSpecialChars: "Project name can't begin with '_' or '-'",
  containsSpecialChars:
    "Project name can contain only latin letters, numbers and symbols '-', '_', '@', '.'",
} as const

const VALIDATION_REGEX_PATTERN = {
  beginsWith: /^(?![_-])/,
  containsChars: /^[a-zA-Z0-9][a-zA-Z0-9@._-]*$/,
} as const

const validationSchema = Yup.object().shape({
  newProjectName: Yup.string()
    .required('Project Name is required')
    .matches(VALIDATION_REGEX_PATTERN.beginsWith, {
      message: VALIDATION_ERROR_MSGS.beginsWithSpecialChars,
      excludeEmptyString: true,
    })
    .matches(VALIDATION_REGEX_PATTERN.containsChars, {
      message: VALIDATION_ERROR_MSGS.containsSpecialChars,
      excludeEmptyString: true,
    })
    .test(
      'is-lowercase',
      'Project Name must be in lower case',
      (value) => value === value.toLowerCase()
    ),
})

const CreateNewProjectPopup: React.FC<CreateNewProjectPopupProps> = ({ open, onClose }) => {
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: yupResolver(validationSchema),
    mode: 'onTouched',
    defaultValues: { newProjectName: '' },
  })

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    userStore.addProject(data.newProjectName)
    if (onClose) onClose()
    reset()
  }

  return (
    <Popup
      submitText="Add"
      header="Add new project"
      className="h-auto w-[600px]"
      visible={open}
      withBorder={false}
      onHide={onClose!}
      onSubmit={handleSubmit(onSubmit)}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4">
          <Controller
            name="newProjectName"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                {...field}
                placeholder="Project Name"
                name="newProjectName"
                error={fieldState.error?.message}
              />
            )}
          />
        </div>
      </form>
    </Popup>
  )
}

export default CreateNewProjectPopup
