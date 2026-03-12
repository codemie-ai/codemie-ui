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

import FormAutocomplete from '@/components/form/FormAutocomplete'
import InfoBox from '@/components/form/InfoBox'
import Input from '@/components/form/Input'
import Link from '@/components/Link'

interface Props {
  control
  errors
  googleDocsGuideEnabled
  googleDocsGuideConfig
  embeddingModels
}

const IndexTypeGoogle: FC<Props> = ({
  errors,
  control,
  googleDocsGuideConfig,
  googleDocsGuideEnabled,
  embeddingModels,
}) => {
  return (
    <div className="mb-4 flex flex-col gap-1">
      <Controller
        name="googleDoc"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            id="googleDoc"
            name="googleDoc"
            placeholder="Google docs link"
            error={errors.googleDoc?.message}
            className="w-full"
          />
        )}
      />
      <div className="flex flex-col gap-2 mt-2">
        {googleDocsGuideEnabled && (
          <InfoBox
            text={
              <>
                Please ensure your Google document is properly formatted and shared with the service
                account. For detailed instructions, refer to the{' '}
                <Link url={googleDocsGuideConfig.url} label="Guide" />
              </>
            }
          />
        )}

        <InfoBox
          text={
            <>
              Google documents must follow a specific format for LLM routing:{' '}
              <Link
                url="https://docs.google.com/document/d/19EXgnFCgJontz0ToCAH6zMGwBTdhi5X97P9JIby4wHs/edit?tab=t.0#heading=h.b01c2ig0adfg"
                label="View Format Example"
              />
            </>
          }
        />
      </div>

      <FormAutocomplete
        name="embeddingsModel"
        control={control}
        id="embeddingsModel"
        label="Model used for embeddings"
        options={embeddingModels}
        placeholder="Embeddings Model Type"
      />
    </div>
  )
}

export default IndexTypeGoogle
