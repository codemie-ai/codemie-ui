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

import { FC } from 'react'
import { Control, Controller } from 'react-hook-form'

import InfoBox from '@/components/form/InfoBox'
import Switch from '@/components/form/Switch'
import Textarea from '@/components/form/Textarea'
import TooltipButton from '@/components/TooltipButton/TooltipButton'
import { FILE_FILTER_PLACEHOLDER, FILES_FILTER_TOOLTIP } from '@/constants/dataSources'

import { FormValues } from '../hooks/useEditPopupForm'

interface Props {
  control: Control<FormValues>
}

const SharePointContentTypesSection: FC<Props> = ({ control }) => (
  <div className="mb-4">
    <p className="mb-2 text-xs text-text-tertiary">Content Types to Index:</p>

    <Controller
      name="includePages"
      control={control}
      render={({ field }) => (
        <Switch
          id="includePages"
          label="Include Pages"
          value={field.value ?? true}
          onChange={(e) => field.onChange(e.target.checked)}
          onBlur={field.onBlur}
          className="mb-2"
        />
      )}
    />

    <Controller
      name="includeDocuments"
      control={control}
      render={({ field }) => (
        <Switch
          id="includeDocuments"
          label="Include Documents"
          value={field.value ?? true}
          onChange={(e) => field.onChange(e.target.checked)}
          onBlur={field.onBlur}
          className="mb-2"
        />
      )}
    />

    <div className="mb-2">
      <Controller
        name="sharepointFilesFilter"
        control={control}
        render={({ field }) => (
          <Textarea
            id="sharepointFilesFilter"
            name="sharepointFilesFilter"
            label="Document Files Filter"
            rows={3}
            value={field.value ?? ''}
            onBlur={field.onBlur}
            placeholder={FILE_FILTER_PLACEHOLDER}
            onChange={(e) => field.onChange(e.target.value)}
          />
        )}
      />
      <div className="flex items-start text-text-secondary text-xs mt-1.5">
        <TooltipButton
          content={FILES_FILTER_TOOLTIP}
          iconClassName="w-[18px] h-[18px]"
          wrapperClassName="mr-2 mt-0.5"
        />
        <span className="mt-0.5">
          Specify file extensions or names to include in indexing. Leaving empty will index all
          documents.
        </span>
      </div>
    </div>

    <Controller
      name="includeLists"
      control={control}
      render={({ field }) => (
        <Switch
          id="includeLists"
          label="Include Lists"
          value={field.value ?? true}
          onChange={(e) => field.onChange(e.target.checked)}
          onBlur={field.onBlur}
          className="mb-2"
        />
      )}
    />

    <InfoBox
      className="mt-2"
      text="Pages: SharePoint site pages (Home, Wiki pages). Documents: Files in document libraries (PDF, Word, Excel, etc.). Lists: SharePoint list items (Tasks, Issues, etc.)."
    />
  </div>
)

export default SharePointContentTypesSection
