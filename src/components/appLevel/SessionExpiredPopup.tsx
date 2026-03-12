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
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { userStore } from '@/store'

const SessionExpiredPopup: FC = () => {
  const { isSessionExpired } = useSnapshot(userStore)
  const [isVisible, setIsVisible] = useState(false)

  const reload = () => {
    window.location.reload()
  }

  useEffect(() => {
    if (isSessionExpired) setIsVisible(true)
  }, [isSessionExpired])

  return (
    <Popup
      limitWidth
      hideFooter
      hideClose
      header="Session Expired"
      visible={isVisible}
      onHide={() => {}}
    >
      <div className="flex flex-col">
        <p className="text-md text-center mb-4">
          Your session has expired. <br />
          Please, reload the page to continue.
        </p>

        <Button className="mb-3 justify-center align-center" onClick={reload}>
          Reload page
        </Button>
      </div>
    </Popup>
  )
}

export default SessionExpiredPopup
