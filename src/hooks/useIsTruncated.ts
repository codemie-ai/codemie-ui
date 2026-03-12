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

import { useEffect, useState } from 'react'

export const useIsTruncated = (ref) => {
  const [isTruncated, setIsTruncated] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const checkTruncation = () => {
      let truncated = false
      if (element.scrollWidth > element.clientWidth) truncated = true
      if (element.scrollHeight > element.clientHeight) truncated = true

      setIsTruncated(truncated)
    }

    const resizeObserver = new ResizeObserver(() => {
      checkTruncation()
    })
    resizeObserver.observe(element)

    setTimeout(() => {
      checkTruncation()
    }, 0)
  }, [ref])

  return isTruncated
}
