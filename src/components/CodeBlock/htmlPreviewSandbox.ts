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

// Approved sandbox token for previewing untrusted, chat-authored HTML/JS in an iframe.
// allow-scripts only: JS executes, but the iframe keeps an opaque origin (no
// allow-same-origin), cannot navigate the top window, and cannot open unsandboxed popups.
// Do not add further tokens without updating this comment and the tests that pin this value.
export const HTML_PREVIEW_SANDBOX = 'allow-scripts'
