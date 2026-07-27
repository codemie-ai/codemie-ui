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

import { FilterOption } from '@/types/filters'

const intlWithTimezones = Intl as unknown as { supportedValuesOf(type: string): string[] }

let cachedOptions: FilterOption[] | null = null

export const getIANATimezoneOptions = (): FilterOption[] => {
  if (!cachedOptions) {
    const supported = intlWithTimezones.supportedValuesOf('timeZone')
    const timezones = supported.includes('UTC') ? supported : ['UTC', ...supported]
    cachedOptions = timezones.map((tz) => ({
      label: tz.replace(/_/g, ' '),
      value: tz,
    }))
  }
  return cachedOptions
}

export const getBrowserTimezone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone
