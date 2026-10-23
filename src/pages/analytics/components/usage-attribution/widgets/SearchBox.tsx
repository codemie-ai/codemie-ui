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

import { FC, useEffect, useRef, useState } from 'react'

import SearchSvg from '@/assets/icons/search.svg?react'
import Input from '@/components/form/Input'

interface SearchBoxProps {
  placeholder: string
  onSearch: (value: string) => void
  ariaLabel?: string
}

/** A search field that reports its value 350 ms after the last keystroke, like the leaderboard search. */
const SearchBox: FC<SearchBoxProps> = ({ placeholder, onSearch, ariaLabel }) => {
  const [value, setValue] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <Input
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      value={value}
      onChange={(e) => {
        const next = e.target.value
        setValue(next)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => onSearch(next.trim()), 350)
      }}
      leftIcon={<SearchSvg className="h-4 w-4 text-text-quaternary" />}
      rootClass="w-[270px] max-w-full shrink-0"
    />
  )
}

export default SearchBox
