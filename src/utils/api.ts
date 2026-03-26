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

import { ENV, HTTP_STATUS } from '@/constants'
import toaster from '@/utils/toaster'
import { getMode, getIsLocalAuth } from '@/utils/utils'

export const ABORT_ERROR = 'AbortError'
export const DEFAULT_ERROR_MESSAGE = 'Oops! Something went wrong'

const DEV_USER_ID = 'dev-codemie-user'

interface RequestOptions extends RequestInit {
  params?: Record<string, any>
  skipErrorHandling?: boolean
  responseType?: any
  queryParamArrayHandling?: 'compact' | 'separate'
}

interface ErrorBody {
  error: {
    message: string
    details?: string | object
    help?: string
  }
}

interface ResponseWithParsedError extends Response {
  parsedError?: {
    message: string
    details?: string | object
    help?: string
  }
}

class API {
  BASE_URL: string

  REDIRECT_RESPONSE: string

  redirectHandler: (response: Response) => void

  constructor() {
    this.BASE_URL = window?._env_?.VITE_API_URL || import.meta.env.VITE_API_URL // nosonar
    this.REDIRECT_RESPONSE = 'opaqueredirect'
    this.redirectHandler = () => {
      console.log('api.redirectHandler is not set')
    }
  }

  get(url: string, options?: RequestOptions): Promise<Response> {
    return this.makeRequest(url, 'GET', undefined, options)
  }

  post(url: string, body?: any, options?: RequestOptions): Promise<Response> {
    return this.makeRequest(url, 'POST', body, options)
  }

  patch(url: string, body?: any, options?: RequestOptions): Promise<Response> {
    return this.makeRequest(url, 'PATCH', body, options)
  }

  put(url: string, body?: any, options?: RequestOptions): Promise<Response> {
    return this.makeRequest(url, 'PUT', body, options)
  }

  delete(url: string, body?: any, options?: RequestOptions): Promise<Response> {
    return this.makeRequest(url, 'DELETE', body, options)
  }

  postMultipart(url: string, body: FormData): Promise<Response> {
    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        ...this.authHeaders(),
      },
      body,
      redirect: 'manual',
      ...(getIsLocalAuth() && { credentials: 'include' as RequestCredentials }),
    }

    return new Promise((resolve, reject) => {
      fetch(`${this.BASE_URL}/${url}`, requestOptions)
        .then((response) => {
          if (!response.ok) {
            response.json().then(this.handleError)
            reject(response)
          } else {
            resolve(response)
          }
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  async stream(
    url: string,
    body: any,
    abortController: AbortController | null = null
  ): Promise<ReadableStreamDefaultReader<string> | Response> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...this.authHeaders(),
    }

    const requestOptions: RequestInit = {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      redirect: 'manual',
      ...(getIsLocalAuth() && { credentials: 'include' as RequestCredentials }),
    }

    if (abortController) {
      requestOptions.signal = abortController.signal
    }

    const response = await fetch(`${this.BASE_URL}/${url}`, requestOptions)
    if (!response.ok) {
      toaster.error('Failed to generate answer')
      const responseValue = await response.body!.getReader().read()
      const rawResponse = new TextDecoder('utf-8').decode(responseValue.value)
      throw JSON.parse(rawResponse)
    }

    const contentType = response.headers.get('Content-Type')
    if (contentType !== 'application/x-ndjson') {
      return response
    }

    return response.body!.pipeThrough(new TextDecoderStream()).getReader()
  }

  async downloadFileStream(url: string, _type?: string, fileName?: string): Promise<boolean> {
    try {
      const headers: HeadersInit = {
        ...this.authHeaders(),
      }

      const requestOptions: RequestInit = {
        method: 'GET',
        headers,
        ...(getIsLocalAuth() && { credentials: 'include' as RequestCredentials }),
      }
      const response = await fetch(`${this.BASE_URL}/${url}`, requestOptions)

      if (!response.ok) {
        const body = await response.json()
        this.handleError(body)
        return false
      }

      const reader = response.body!.getReader()
      const stream = new ReadableStream({
        start(controller) {
          const push = () => {
            reader.read().then(({ done, value }) => {
              if (done) {
                controller.close()
                return
              }
              controller.enqueue(value)
              push()
            })
          }
          push()
        },
      })

      const blob = await new Response(stream).blob()
      const fileUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')

      if (!fileName) {
        const contentDisposition = response.headers.get('content-disposition')
        fileName = contentDisposition?.split('filename=')[1]
      }

      a.style.display = 'none'
      a.href = fileUrl
      a.download = fileName ?? 'download'
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(fileUrl)
      document.body.removeChild(a)

      return true
    } catch (error) {
      console.error('File Download failed', error)
      toaster.error(error as string)
      return false
    }
  }

  makeRequest(
    url: string,
    method: string,
    body?: any,
    options: RequestOptions = {}
  ): Promise<Response> {
    const { skipErrorHandling, params, queryParamArrayHandling = 'separate' } = options

    // Build URL with query parameters if provided
    let fullUrl = `${this.BASE_URL}/${url}`
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            if (queryParamArrayHandling === 'compact') {
              // Compact mode: join array values with comma
              searchParams.append(key, value.join(','))
            } else {
              // Separate mode (default): add multiple query params
              value.forEach((item) => {
                searchParams.append(key, String(item))
              })
            }
          } else {
            searchParams.append(key, String(value))
          }
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        fullUrl += `?${queryString}`
      }
    }

    return new Promise((resolve, reject) => {
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders(),
        },
        body: JSON.stringify(body),
        redirect: 'manual',
        ...(getIsLocalAuth() && { credentials: 'include' }),
      }

      fetch(fullUrl, requestOptions)
        .then(async (response) => {
          if (response.type === this.REDIRECT_RESPONSE) {
            this.redirectHandler(response)
            return reject(response)
          }

          if (response.ok) {
            return resolve(response)
          }
          if (response.status === HTTP_STATUS.UNAUTHORIZED && getIsLocalAuth()) {
            const isUserEndpoint = url === 'v1/user'
            const isAuthPage = window.location.hash === '#/auth/sign-in'

            if (!isUserEndpoint) {
              sessionStorage.setItem('sessionExpired', 'true')
            }

            if (!isAuthPage) {
              window.location.hash = '#/auth/sign-in'
            }

            return reject(response)
          }
          const responseClone = response.clone() as ResponseWithParsedError
          let errorData: ErrorBody
          try {
            const contentType = response.headers.get('content-type')
            if (contentType?.includes('application/json')) {
              errorData = await response.json()
            } else if (contentType?.includes('text/plain')) {
              const text = await response.text()
              errorData = { error: { message: text } }
            } else {
              errorData = { error: { message: 'Unknown error' } }
            }
          } catch (e) {
            errorData = { error: { message: (e as Error).message } }
          }
          if (!skipErrorHandling) {
            this.handleError?.(errorData)
          }
          responseClone.parsedError = errorData.error
          return reject(responseClone)
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  /**
   * If dev, send 'user-id' header for auth
   * In prod we use Keycloak
   */
  authHeaders(): Record<string, string> {
    return getMode() === ENV.LOCAL && !getIsLocalAuth() ? { 'user-id': DEV_USER_ID } : {}
  }

  handleError(body: ErrorBody, includeHelp = true): void {
    try {
      const { message, details, help } = body.error
      let strDetails: string

      if (typeof details === 'object') {
        strDetails = JSON.stringify(details)
      } else {
        strDetails = details ?? ''
      }

      let formattedError = message

      if (strDetails) {
        // @ts-expect-error: Property 'replaceAll' does not exist on type 'string'. Do you need to change your target library? Try changing the 'lib' compiler option to 'es2021' or later
        formattedError += `<br> ${strDetails.replaceAll('<br>', '').trim()}`
      }

      if (includeHelp && help) {
        formattedError += `<br><i>${help}</i>`
      }

      toaster.error(formattedError)
    } catch (error) {
      console.error('Error handling issue:', error)
      toaster.error(DEFAULT_ERROR_MESSAGE)
    }
  }
}

export default new API()
