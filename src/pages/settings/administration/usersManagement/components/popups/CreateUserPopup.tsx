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
import { Controller, Resolver, useForm } from 'react-hook-form'
import * as yup from 'yup'

import Input from '@/components/form/Input/Input'
import Switch from '@/components/form/Switch'
import Popup from '@/components/Popup'
import { userStore } from '@/store/user'
import { UserCreatePayload } from '@/types/entity/user'

interface CreateUserPopupProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

interface CreateUserFormData {
  email: string
  username: string
  password: string
  name: string
  is_admin: boolean
  is_maintainer: boolean
  is_auditor: boolean
}

const schema = yup.object({
  email: yup.string().email('Enter a valid email').required('Email is required'),
  username: yup
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .required('Username is required'),
  password: yup.string().required('Password is required'),
  name: yup.string().default(''),
  is_admin: yup.boolean().required().default(false),
  is_maintainer: yup.boolean().required().default(false),
  is_auditor: yup.boolean().required().default(false),
})

const defaultValues: CreateUserFormData = {
  email: '',
  username: '',
  password: '',
  name: '',
  is_admin: false,
  is_maintainer: false,
  is_auditor: false,
}

const CreateUserPopup: FC<CreateUserPopupProps> = ({ isOpen, onClose, onCreated }) => {
  const {
    control,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<CreateUserFormData>({
    defaultValues,
    resolver: yupResolver(schema) as unknown as Resolver<CreateUserFormData>,
  })

  const isAdminValue = watch('is_admin')
  const isMaintainerValue = watch('is_maintainer')

  useEffect(() => {
    if (!isOpen) {
      reset(defaultValues)
    }
  }, [isOpen, reset])

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      await userStore.createUser(data as UserCreatePayload)
      onCreated()
    } catch {
      // Failure is already toasted by userStore.createUser; keep the popup open.
    }
  }

  return (
    <Popup
      header="Create user"
      className="w-[500px]"
      submitText="Create"
      submitDisabled={isSubmitting}
      visible={isOpen}
      onHide={onClose}
      onSubmit={handleSubmit(onSubmit)}
      withBorderBottom={false}
    >
      <div className="flex flex-col gap-4">
        <Controller
          name="email"
          control={control}
          render={({ field, fieldState }) => (
            <Input
              id="create-user-email"
              label="Email"
              type="email"
              required
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="username"
          control={control}
          render={({ field, fieldState }) => (
            <Input
              id="create-user-username"
              label="Username"
              required
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="password"
          control={control}
          render={({ field, fieldState }) => (
            <Input
              id="create-user-password"
              label="Password"
              type="password"
              required
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <Input
              id="create-user-name"
              label="Name"
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <div className="flex flex-col gap-3 rounded-lg border border-border-structural p-4">
          <span className="text-xs font-medium text-text-primary">Platform Roles</span>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
            <Controller
              name="is_auditor"
              control={control}
              render={({ field }) => (
                <Switch
                  id="create-user-auditor"
                  label="Auditor"
                  value={field.value}
                  disabled={isAdminValue || isMaintainerValue}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              )}
            />
            <Controller
              name="is_admin"
              control={control}
              render={({ field }) => (
                <Switch
                  id="create-user-admin"
                  label="Admin"
                  value={field.value}
                  disabled={isMaintainerValue}
                  onChange={(e) => {
                    const value = e.target.checked
                    field.onChange(value)
                    if (value) {
                      setValue('is_auditor', false)
                    }
                  }}
                />
              )}
            />
            <Controller
              name="is_maintainer"
              control={control}
              render={({ field }) => (
                <Switch
                  id="create-user-maintainer"
                  label="Maintainer"
                  value={field.value}
                  onChange={(e) => {
                    const value = e.target.checked
                    field.onChange(value)
                    if (value) {
                      setValue('is_admin', true)
                      setValue('is_auditor', false)
                    }
                  }}
                />
              )}
            />
          </div>
        </div>
      </div>
    </Popup>
  )
}

export default CreateUserPopup
