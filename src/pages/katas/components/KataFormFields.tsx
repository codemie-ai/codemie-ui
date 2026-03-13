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

import { Controller, Control, FieldErrors } from 'react-hook-form'

import Input from '@/components/form/Input'
import InputArray from '@/components/form/InputArray'
import LinksArray from '@/components/form/LinksArray/LinksArray'
import MarkdownEditor from '@/components/form/MarkdownEditor/MarkdownEditor'
import MultiSelect from '@/components/form/MultiSelect'
import Select from '@/components/form/Select'
import Textarea from '@/components/form/Textarea'
import { KATA_CONSTRAINTS } from '@/constants/katas'

import { levelOptions, KataFormData } from '../schema'

interface KataFormFieldsProps {
  control: Control<KataFormData>
  errors: FieldErrors<KataFormData>
  tagOptions: Array<{ label: string; value: string }>
  roleOptions: Array<{ label: string; value: string }>
  isLoadingOptions: boolean
}

const KataFormFields = ({
  control,
  errors,
  tagOptions,
  roleOptions,
  isLoadingOptions,
}: KataFormFieldsProps) => {
  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <Controller
        name="title"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            label="Title"
            placeholder="Enter kata title"
            error={errors.title?.message}
            required
          />
        )}
      />

      {/* Description */}
      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <Textarea
            {...field}
            label="Description"
            placeholder="Enter kata description"
            error={errors.description?.message}
            required
            rows={3}
          />
        )}
      />

      {/* Level & Duration - Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Controller
            name="level"
            control={control}
            render={({ field }) => (
              <>
                <Select {...field} label="Level" options={levelOptions} required />
                {errors.level && (
                  <div className="text-text-error text-sm">{errors.level.message}</div>
                )}
              </>
            )}
          />
        </div>

        <Controller
          name="duration_minutes"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              type="number"
              label="Duration (minutes)"
              placeholder="15"
              error={errors.duration_minutes?.message}
              required
            />
          )}
        />
      </div>

      {/* Tags */}
      <Controller
        name="tags"
        control={control}
        render={({ field }) => (
          <MultiSelect
            label="Tags"
            value={field.value}
            onChange={(e) => field.onChange(e.value)}
            options={tagOptions}
            placeholder="Select tags (max 3)"
            hint="Choose relevant tags to help users find your kata"
            error={errors.tags?.message}
            disabled={isLoadingOptions}
            loading={isLoadingOptions}
            showCheckbox
            scrollHeight="250px"
            max={KATA_CONSTRAINTS.MAX_TAGS}
          />
        )}
      />

      {/* Roles */}
      <Controller
        name="roles"
        control={control}
        render={({ field }) => (
          <MultiSelect
            label="Target Roles"
            value={field.value}
            onChange={(e) => field.onChange(e.value)}
            options={roleOptions}
            placeholder="Select target roles (max 3)"
            hint="Select the roles this kata is designed for"
            error={errors.roles?.message}
            disabled={isLoadingOptions}
            loading={isLoadingOptions}
            showCheckbox
            scrollHeight="250px"
            max={KATA_CONSTRAINTS.MAX_ROLES}
          />
        )}
      />

      {/* Image URL */}
      <Controller
        name="image_url"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            type="url"
            label="Image URL (optional)"
            placeholder="https://example.com/image.png"
            hint="Provide a URL to an image representing this kata"
            error={errors.image_url?.message}
          />
        )}
      />

      {/* Links */}
      <Controller
        name="links"
        control={control}
        render={({ field }) => (
          <LinksArray
            {...field}
            label="Links (optional)"
            hint="Add helpful links to documentation, videos, tutorials, or other resources"
            error={errors.links?.message}
          />
        )}
      />

      {/* References */}
      <Controller
        name="references"
        control={control}
        render={({ field }) => {
          // Get per-item errors
          const itemErrors = Array.isArray(errors.references)
            ? errors.references.map((err) => err?.message)
            : []
          const arrayError = errors.references?.message

          return (
            <InputArray
              {...field}
              isAIGenerated={false}
              label="References (optional)"
              hint="Add URLs to external resources, documentation, or articles"
              itemErrors={itemErrors}
              error={arrayError}
            />
          )
        }}
      />

      {/* Steps (Markdown) */}
      <Controller
        name="steps"
        control={control}
        render={({ field }) => (
          <MarkdownEditor
            {...field}
            label="Steps (Markdown)"
            error={errors.steps?.message}
            required
            rows={15}
          />
        )}
      />
    </div>
  )
}

export default KataFormFields
