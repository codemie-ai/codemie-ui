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

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { A2uiSurface } from '@/a2ui/config'
import type { A2uiEnvelope } from '@/a2ui/types'
import { isSurfaceValid, useA2uiSurface } from '@/a2ui/useA2uiSurface'

/**
 * The email form an agent actually produced: two mandatory fields and two optional ones
 * whose only check is a regex written to allow empty (`^$|...`). Reported live as
 * "optional fields became mandatory".
 */
const ENVELOPES = [
  {
    'version': 'v0.9.1',
    'createSurface': {
      'catalogId': 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json',
      'surfaceId': '68c90fb4-01ad-49ee-b7c9-09642882c907'
    }
  },
  {
    'version': 'v0.9.1',
    'updateComponents': {
      'surfaceId': '68c90fb4-01ad-49ee-b7c9-09642882c907',
      'components': [
        {
          'id': 'root',
          'children': [
            'title',
            'to_field',
            'subject_field',
            'body_field',
            'cc_field',
            'bcc_field',
            'attachments_note',
            'send_button'
          ],
          'component': 'Column'
        },
        {
          'id': 'title',
          'text': 'Форма для отправки электронного письма',
          'component': 'Text'
        },
        {
          'id': 'to_field',
          'label': 'Кому (e-mail, через запятую если несколько)',
          'value': {
            'path': '/to'
          },
          'checks': [
            {
              'message': "Поле 'Кому' обязательно для заполнения",
              'condition': {
                'args': {
                  'value': {
                    'path': '/to'
                  }
                },
                'call': 'required'
              }
            },
            {
              'message': 'Введите корректные email адреса через запятую',
              'condition': {
                'args': {
                  'value': {
                    'path': '/to'
                  },
                  'pattern': '^([\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}(,\\s*)?)+$'
                },
                'call': 'regex'
              }
            }
          ],
          'variant': 'shortText',
          'component': 'TextField'
        },
        {
          'id': 'cc_field',
          'label': 'Копия (CC, не обязательно, e-mail через запятую)',
          'value': {
            'path': '/cc'
          },
          'checks': [
            {
              'message': 'Введите корректные email адреса через запятую или оставьте пустым',
              'condition': {
                'args': {
                  'value': {
                    'path': '/cc'
                  },
                  'pattern': '^$|([\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}(,\\s*)?)+$'
                },
                'call': 'regex'
              }
            }
          ],
          'variant': 'shortText',
          'component': 'TextField'
        },
        {
          'id': 'bcc_field',
          'label': 'Скрытая копия (BCC, не обязательно, e-mail через запятую)',
          'value': {
            'path': '/bcc'
          },
          'checks': [
            {
              'message': 'Введите корректные email адреса через запятую или оставьте пустым',
              'condition': {
                'args': {
                  'value': {
                    'path': '/bcc'
                  },
                  'pattern': '^$|([\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}(,\\s*)?)+$'
                },
                'call': 'regex'
              }
            }
          ],
          'variant': 'shortText',
          'component': 'TextField'
        },
        {
          'id': 'subject_field',
          'label': 'Тема письма',
          'value': {
            'path': '/subject'
          },
          'checks': [
            {
              'message': "Поле 'Тема' обязательно для заполнения",
              'condition': {
                'args': {
                  'value': {
                    'path': '/subject'
                  }
                },
                'call': 'required'
              }
            }
          ],
          'variant': 'shortText',
          'component': 'TextField'
        },
        {
          'id': 'body_field',
          'label': 'Текст письма',
          'value': {
            'path': '/body'
          },
          'checks': [
            {
              'message': "Поле 'Текст письма' обязательно для заполнения",
              'condition': {
                'args': {
                  'value': {
                    'path': '/body'
                  }
                },
                'call': 'required'
              }
            }
          ],
          'variant': 'longText',
          'component': 'TextField'
        },
        {
          'id': 'attachments_note',
          'text': 'ℹ️ Вложения не поддерживаются в этой версии формы. Если нужны вложения, напишите в тексте письма.',
          'component': 'Text'
        },
        {
          'id': 'send_button',
          'child': 'send_label',
          'action': {
            'event': {
              'name': 'submit'
            }
          },
          'variant': 'primary',
          'component': 'Button'
        },
        {
          'id': 'send_label',
          'text': 'Отправить письмо',
          'component': 'Text'
        }
      ]
    }
  }
] as unknown as A2uiEnvelope[]

const Probe = () => {
  const { surfaces } = useA2uiSurface(ENVELOPES, () => {})
  // The production gate runs at click time (ChatA2uiBlock.handleAction), not during
  // render, so the probe reads validity the same way instead of caching a stale value.
  const [valid, setValid] = useState('unchecked')
  return (
    <div>
      <button type="button" onClick={() => {
          setValid(String(isSurfaceValid(surfaces[0])))
        }}>
        check validity
      </button>
      <span data-testid="valid">{valid}</span>
      {surfaces.map((s) => (
        <A2uiSurface key={s.id} surface={s} />
      ))}
    </div>
  )
}

describe('agent-authored email form', () => {
  it('does not report the optional copy fields as invalid', async () => {
    const user = userEvent.setup()
    render(<Probe />)

    // Untouched: only the three genuinely required fields may complain.
    expect(screen.queryAllByText(/оставьте пустым/)).toHaveLength(0)

    // Fill only the mandatory fields; CC and BCC stay empty on purpose.
    await user.type(screen.getByLabelText(/Кому/), 'a@b.co')
    await user.type(screen.getByLabelText(/Тема письма/), 'Hi')
    await user.type(document.querySelector('textarea') as HTMLTextAreaElement, 'Body')

    // The optional CC/BCC are still empty, and that must be enough to submit.
    await user.click(screen.getByRole('button', { name: 'check validity' }))
    expect(screen.getByTestId('valid').textContent).toBe('true')
  })
})
