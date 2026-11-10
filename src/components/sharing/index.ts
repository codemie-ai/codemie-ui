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
export { default as SharePopup } from './SharePopup'
export type { SharePopupProps } from './SharePopup'
export { default as SharedWithList } from './SharedWithList'
export { default as SharedWithLoadError } from './SharedWithLoadError'
export { default as ShareLinkSection } from './ShareLinkSection'
export type { ShareLinkSectionProps, ShareLinkValue } from './ShareLinkSection'
export { bindSharing, createSharingClient } from './sharingClient'
export type { BoundSharing, SharingClient, SharingClientOptions } from './sharingClient'
export { useSharedWith } from './useSharedWith'
export type { SharedWith, UseSharedWithOptions } from './useSharedWith'
