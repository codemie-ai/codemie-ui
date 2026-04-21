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

import { useLayoutEffect } from 'react'

import {
  EDIT_WORKFLOW,
  NEW_WORKFLOW,
  NEW_WORKFLOW_FROM_TEMPLATE,
  VIEW_WORKFLOW,
  WOKRFLOW_EXECUTIONS,
} from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'

const moveToastPages = [
  EDIT_WORKFLOW,
  NEW_WORKFLOW,
  NEW_WORKFLOW_FROM_TEMPLATE,
  VIEW_WORKFLOW,
  WOKRFLOW_EXECUTIONS,
]

const ToastContainer: React.FC = () => {
  const { name } = useVueRouter()

  useLayoutEffect(() => {
    const container = document.getElementById('toast-container')
    if (!container) return

    if (moveToastPages.includes(name)) container.style.top = '100px'
    else container.style.top = '55px'
  }, [name])

  return <div id="toast-container" role="region" aria-live="polite" />
}

export default ToastContainer
