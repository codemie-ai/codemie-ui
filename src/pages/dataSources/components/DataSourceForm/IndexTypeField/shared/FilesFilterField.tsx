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

import { FC } from 'react'
import { Controller } from 'react-hook-form'

import Textarea from '@/components/form/Textarea'
import TooltipButton from '@/components/TooltipButton'
import { FILE_FILTER_PLACEHOLDER } from '@/constants/dataSources'

const FILES_FILTER_TOOLTIP = `- Patterns (e.g., *.py): Include ONLY matching files
- !Patterns (e.g., !*.nupkg): EXCLUDE matching files
- Combined (e.g., *.py + !test_*.py): Include .py files except test_*.py files`

interface Props {
  control
  errors
}

const FilesFilterField: FC<Props> = ({ control, errors }) => (
  <>
    <Controller
      name="filesFilter"
      control={control}
      render={({ field }) => (
        <Textarea
          id="filesFilter"
          name="filesFilter"
          label="Files Filter"
          rows={4}
          value={field.value}
          onBlur={field.onBlur}
          error={errors.filesFilter?.message}
          placeholder={FILE_FILTER_PLACEHOLDER}
          onChange={(e) => field.onChange(e.target.value)}
        />
      )}
    />

    <div className="flex items-start text-text-secondary text-xs my-3">
      <TooltipButton
        content={FILES_FILTER_TOOLTIP}
        iconClassName="w-[18px] h-[18px]"
        wrapperClassName="mr-2 mt-0.5"
      />
      <span className="mt-0.5">
        Specify file extensions or names to include in indexing. Leaving empty will index all files.
      </span>
    </div>
  </>
)

export default FilesFilterField
