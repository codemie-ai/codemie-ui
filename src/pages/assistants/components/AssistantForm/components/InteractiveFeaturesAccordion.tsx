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
import { Control, Controller } from 'react-hook-form'

import Accordion from '@/components/Accordion'
import { useInteractiveElementsEnabled } from '@/hooks/useFeatureFlags'

import InteractiveFeaturesSection from './InteractiveFeaturesSection'

import type { AssistantFormSchema } from '../AssistantForm'

interface InteractiveFeaturesAccordionProps {
  control: Control<AssistantFormSchema>
}

const InteractiveFeaturesAccordion: FC<InteractiveFeaturesAccordionProps> = ({ control }) => {
  const [isInteractiveElementsEnabled] = useInteractiveElementsEnabled()

  if (!isInteractiveElementsEnabled) {
    return null
  }

  return (
    <div>
      <Accordion
        title="Interactive features"
        description="Let the assistant request structured input directly in chat — buttons, choices, forms, dropdowns, and date pickers."
        defaultOpen={false}
      >
        <div className="px-4 pb-4 flex flex-col gap-4">
          <Controller
            name="interactive_features"
            control={control}
            render={({ field }) => (
              <InteractiveFeaturesSection
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </div>
      </Accordion>
    </div>
  )
}

export default InteractiveFeaturesAccordion
