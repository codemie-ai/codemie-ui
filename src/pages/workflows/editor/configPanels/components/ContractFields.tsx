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

import { Control } from 'react-hook-form'

import ExpandableTextarea from '@/components/form/ExpandableTextarea/ExpandableTextarea'
import Select from '@/components/form/Select'

import FieldController from './FieldController'
import { buildModeOptions, NODE_MODE_HINT, NODE_MODE_SELECT_ID } from '../utils/contractModes'

import type { CommonNodeFieldValues } from '../CommonStateFields'

const WORKFLOW_DEFAULT_LABEL = 'Use workflow default'

const MODE_OPTIONS = buildModeOptions(WORKFLOW_DEFAULT_LABEL)

interface ContractFieldsProps {
  control: Control<CommonNodeFieldValues>
  /** Transform keeps its own output control in TransformForm, so it hides the output contract. */
  showOutput?: boolean
  /** Off while the platform does not analyse contracts: only the output contract stays. */
  showLinking?: boolean
}

/** Input contract, output contract and save validation of an action node. */
const ContractFields = ({
  control,
  showOutput = true,
  showLinking = true,
}: Readonly<ContractFieldsProps>) => (
  <div className="flex flex-col gap-4">
    {showLinking && (
      <FieldController
        name="input_schema"
        control={control}
        render={({ field, fieldState }) => (
          <ExpandableTextarea
            {...field}
            label="Input contract"
            placeholder="Expected input format (JSON Schema)"
            rows={4}
            error={fieldState.error?.message}
            warning={fieldState.warning}
          />
        )}
      />
    )}

    {showOutput && (
      <FieldController
        name="output_schema"
        control={control}
        render={({ field, fieldState }) => (
          <ExpandableTextarea
            {...field}
            label="Output contract"
            placeholder="Expected output format (JSON Schema)"
            rows={4}
            error={fieldState.error?.message}
            warning={fieldState.warning}
          />
        )}
      />
    )}

    {showLinking && (
      <FieldController
        name="save_validation"
        control={control}
        stateOnly
        render={({ field, fieldState }) => (
          <Select
            id={NODE_MODE_SELECT_ID}
            label="Save validation"
            hint={NODE_MODE_HINT}
            value={field.value || null}
            placeholder={WORKFLOW_DEFAULT_LABEL}
            inputRef={field.ref}
            error={fieldState.error?.message}
            warning={fieldState.warning}
            options={MODE_OPTIONS}
            onChangeValue={(value) => field.onChange(value ?? '')}
          />
        )}
      />
    )}
  </div>
)

export default ContractFields
