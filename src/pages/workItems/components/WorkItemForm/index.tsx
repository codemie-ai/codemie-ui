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
import React, { useEffect } from 'react'
import { Controller, Resolver, useForm } from 'react-hook-form'

import Input from '@/components/form/Input'
import Select from '@/components/form/Select'
import Textarea from '@/components/form/Textarea'
import Popup from '@/components/Popup'
import {
  WORK_ITEM_PRIORITY_OPTIONS,
  WORK_ITEM_STATUS_OPTIONS,
  WORK_ITEM_TYPE_OPTIONS,
} from '@/constants/workItems'
import { workItemsStore } from '@/store/workItems'
import { WorkItem } from '@/types/entity/workItem'

import { WorkItemFormData, defaultWorkItemFormValues, workItemSchema } from './formSchema'

interface WorkItemFormProps {
  visible: boolean
  onHide: () => void
  editItem?: WorkItem | null
}

const WorkItemForm: React.FC<WorkItemFormProps> = ({ visible, onHide, editItem }) => {
  const isEditing = !!editItem

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WorkItemFormData>({
    resolver: yupResolver(workItemSchema) as Resolver<WorkItemFormData>,
    defaultValues: defaultWorkItemFormValues,
  })

  useEffect(() => {
    if (visible) {
      if (editItem) {
        reset({
          title: editItem.title,
          description: editItem.description ?? '',
          type: editItem.type,
          priority: editItem.priority,
          status: editItem.status,
          assignee: editItem.assignee ?? '',
          tags: editItem.tags ?? [],
        })
      } else {
        reset(defaultWorkItemFormValues)
      }
    }
  }, [visible, editItem, reset])

  const handleClose = () => {
    reset(defaultWorkItemFormValues)
    onHide()
  }

  const onSubmit = handleSubmit(async (data: WorkItemFormData) => {
    const payload = {
      ...data,
      description: data.description || undefined,
      assignee: data.assignee || undefined,
      tags: data.tags?.filter(Boolean) ?? [],
    }
    if (editItem) {
      await workItemsStore.updateItem(editItem.id, payload)
    } else {
      await workItemsStore.createItem(payload)
    }
    handleClose()
  })

  return (
    <Popup
      visible={visible}
      onHide={handleClose}
      onSubmit={onSubmit}
      header={isEditing ? 'Edit Work Item' : 'Create Work Item'}
      submitText={isEditing ? 'Save' : 'Create'}
      submitDisabled={isSubmitting}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Controller
          name="title"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              label="Title"
              required
              error={errors.title?.message}
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? 'title-error' : undefined}
            />
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Textarea {...field} label="Description" rows={3} error={errors.description?.message} />
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                label="Type"
                required
                options={WORK_ITEM_TYPE_OPTIONS}
                error={errors.type?.message}
              />
            )}
          />

          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                label="Priority"
                required
                options={WORK_ITEM_PRIORITY_OPTIONS}
                error={errors.priority?.message}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                label="Status"
                required
                options={WORK_ITEM_STATUS_OPTIONS}
                error={errors.status?.message}
              />
            )}
          />

          <Controller
            name="assignee"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                label="Assignee"
                placeholder="User ID or name"
                error={errors.assignee?.message}
              />
            )}
          />
        </div>

        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <Input
              value={(field.value ?? []).join(', ')}
              onChange={(e) => {
                const raw = e.target.value
                field.onChange(
                  raw
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean)
                )
              }}
              label="Tags"
              placeholder="Comma-separated tags"
              error={errors.tags?.message}
            />
          )}
        />
      </form>
    </Popup>
  )
}

export default WorkItemForm
