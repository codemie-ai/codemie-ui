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

import { FC, useEffect, useState } from 'react'

import Button from '@/components/Button'
import SchemaForm from '@/components/SchemaForm'
import { ButtonType } from '@/constants'
import { SettingDeclaration, SettingValue } from '@/types/entity/customerConfiguration'
import { cn } from '@/utils/utils'

interface Props {
  setting: SettingDeclaration
  onSave: (componentId: string, value: Record<string, SettingValue>) => Promise<void>
  onReset: (componentId: string) => Promise<void>
}

const SettingCard: FC<Props> = ({ setting, onSave, onReset }) => {
  const [value, setValue] = useState<Record<string, SettingValue>>(setting.value)
  const [isValid, setIsValid] = useState(true)
  const [isBusy, setIsBusy] = useState(false)

  // Compare by content: saving one card refetches the whole list, so every other card gets a
  // new object reference carrying the same value — resyncing on the reference alone would
  // discard edits the admin has not saved yet.
  const storedValue = JSON.stringify(setting.value)

  useEffect(() => {
    setValue(JSON.parse(storedValue))
  }, [storedValue])

  const run = async (action: () => Promise<void>) => {
    setIsBusy(true)
    try {
      await action()
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-4 p-6 rounded-lg border border-stroke-primary">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-text-primary">{setting.label}</h3>
          {setting.description && (
            <p className="text-sm-1 text-text-secondary">{setting.description}</p>
          )}
        </div>
        <span
          className={cn(
            'shrink-0 px-2 py-0.5 rounded text-xs',
            setting.overridden
              ? 'bg-surface-accent text-text-accent'
              : 'bg-surface-secondary text-text-secondary'
          )}
        >
          {setting.overridden ? 'Overridden' : 'Default from config'}
        </span>
      </header>

      <SchemaForm
        fields={setting.fields}
        value={value}
        onChange={setValue}
        onValidityChange={setIsValid}
      />

      <footer className="flex items-center gap-3">
        <Button
          type={ButtonType.PRIMARY}
          disabled={!isValid || isBusy}
          onClick={() => run(() => onSave(setting.component_id, value))}
        >
          Save
        </Button>
        {setting.overridden && (
          <Button
            type={ButtonType.SECONDARY}
            disabled={isBusy}
            onClick={() => run(() => onReset(setting.component_id))}
          >
            Reset to default
          </Button>
        )}
      </footer>
    </section>
  )
}

export default SettingCard
