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

import Quill from 'quill'
import QuillImageDropAndPaste from 'quill-image-drop-and-paste'
import 'quill-mention/autoregister'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'

import { themeService } from '@/utils/themeService'
import { setupGlobalTooltip } from '@/utils/tooltip'
import { monkeyPatchQuill, removeTextFormattingOnCopy } from '@/utils/utils'

import { router } from './router'

import './assets/stylesheets/main.scss'
import './assets/stylesheets/vue_components.scss'

monkeyPatchQuill()
Quill.register('modules/imageDropAndPaste', QuillImageDropAndPaste)

themeService.watchSystemTheme()
removeTextFormattingOnCopy()
setupGlobalTooltip()

const root = document.getElementById('app')

ReactDOM.createRoot(root).render(<RouterProvider router={router} />)
