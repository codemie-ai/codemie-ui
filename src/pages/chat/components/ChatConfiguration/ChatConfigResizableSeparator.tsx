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

import { Separator } from 'react-resizable-panels'

// Separator between the chat area and configuration panel.
// The library handles keyboard resize via ←/→ arrow keys and manages
// aria-valuenow / aria-valuemin / aria-valuemax on the element automatically.
const ChatConfigResizableSeparator = () => (
  <Separator
    aria-label="Resize configuration panel"
    aria-controls="chat-area chat-config"
    aria-orientation="vertical"
    className="relative w-4 -mx-2 bg-transparent !cursor-[ew-resize] !outline-none z-[1] flex items-center justify-center group"
  >
    {/* Decorative pill — focus ring appears here so the indicator is visible */}
    <div
      aria-hidden="true"
      className="h-10 w-1 rounded-full bg-black/20 [.codemieDark_&]:bg-white/25 pointer-events-none transition-all duration-150 group-hover:bg-black/45 [.codemieDark_&]:group-hover:bg-white/50 group-hover:h-12 group-focus-visible:bg-black/60 [.codemieDark_&]:group-focus-visible:bg-white/65 group-focus-visible:h-12 group-focus-visible:w-[3px] group-focus-visible:ring-2 group-focus-visible:ring-black/30 [.codemieDark_&]:group-focus-visible:ring-white/50"
    />
  </Separator>
)

export default ChatConfigResizableSeparator
