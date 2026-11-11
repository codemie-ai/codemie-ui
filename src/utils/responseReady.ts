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

export const RESPONSE_READY_PREFIX = 'Response ready'
export const RESPONSE_READY_NOTIFICATION_TITLE = 'CodeMie'
export const RESPONSE_READY_NOTIFICATION_BODY = 'AI response is ready'
export const PERMISSION_HINT_DELAY_MS = 10000
export const PERMISSION_HINT_TEXT =
  'Notifications are not enabled<br>If no permission prompt appeared, allow notifications for this site in your browser settings to be alerted when a response is ready.'

export const notificationSupported = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window

export const showResponseReadyNotification = (): Notification =>
  new window.Notification(RESPONSE_READY_NOTIFICATION_TITLE, {
    body: RESPONSE_READY_NOTIFICATION_BODY,
  })

export const formatDocumentTitle = (pageTitle: string, pending: boolean): string =>
  pending ? `${RESPONSE_READY_PREFIX} - ${pageTitle}` : pageTitle
