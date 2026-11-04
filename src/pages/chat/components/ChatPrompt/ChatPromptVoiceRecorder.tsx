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

/* eslint-disable no-alert */
import { OverlayPanel } from 'primereact/overlaypanel'
import { FC, MouseEvent, useEffect, useRef, useState } from 'react'

import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import RecordSvg from '@/assets/icons/record.svg?react'
import StopSvg from '@/assets/icons/stop.svg?react'
import { chatsStore } from '@/store/chats'
import { ModelOption } from '@/types/entity/configuration'
import { cn } from '@/utils/utils'

const MICROPHONE_TIMEOUT = 10000

interface ChatPromptVoiceRecorderProps {
  onTextReady: (text: string) => void
  conversationId?: string
  sttModels?: ModelOption[]
  selectedModel?: string
  onModelChange?: (name: string) => void
}

const ChatPromptVoiceRecorder: FC<ChatPromptVoiceRecorderProps> = ({
  onTextReady,
  conversationId,
  sttModels,
  selectedModel,
  onModelChange,
}) => {
  const audioChunks = useRef<Blob[]>([])
  const recorder = useRef<MediaRecorder | null>(null)
  const timeoutId = useRef<number | null>(null)
  const panelRef = useRef<OverlayPanel>(null)

  const [isUserSpeaking, setIsUserSpeaking] = useState(false)

  const showModelPicker = (sttModels?.length ?? 0) >= 2

  const processSpeech = async (blob: Blob) => {
    try {
      const response = await chatsStore.recognizeSpeech(blob, selectedModel, conversationId)

      if (response?.message) onTextReady(response.message)
      else console.warn('No message received from speech recognition')
    } catch (error) {
      console.error('Speech recognition error:', error)
    }
  }

  const stopRecording = () => {
    recorder.current?.stop()
    recorder.current?.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop())
    setIsUserSpeaking(false)
    if (timeoutId.current) {
      clearTimeout(timeoutId.current)
      timeoutId.current = null
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      recorder.current = new MediaRecorder(stream)
      recorder.current.ondataavailable = (e) => {
        audioChunks.current.push(e.data)

        if (recorder.current?.state === 'inactive') {
          const blob = new Blob(audioChunks.current, { type: 'audio/wav' })
          audioChunks.current = []
          processSpeech(blob)
        }
      }

      recorder.current.start()
    } catch (error) {
      if (!(error instanceof Error)) return

      console.error('Error accessing microphone:', error)
      setIsUserSpeaking(false)

      if (error.name === 'NotAllowedError') {
        alert('Microphone access denied. Please allow microphone access in your browser settings.')
      } else if (error.name === 'NotFoundError') {
        alert('No microphone found. Please check your microphone connection.')
      } else {
        alert('Error accessing microphone: ' + error.message)
      }
    }
  }

  const toggleRecording = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()

    if (isUserSpeaking) {
      stopRecording()
    } else {
      setIsUserSpeaking(true)
      startRecording()

      if (timeoutId.current) clearTimeout(timeoutId.current)

      timeoutId.current = window.setTimeout(() => {
        stopRecording()
      }, MICROPHONE_TIMEOUT)
    }
  }

  const handleCaretClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    panelRef.current?.toggle(e)
  }

  const handleModelSelect = (modelName: string) => {
    onModelChange?.(modelName)
    panelRef.current?.hide()
  }

  useEffect(() => {
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current)
      }
      if (recorder.current?.state === 'recording') {
        stopRecording()
      }
    }
  }, [])

  const micButton = (
    <button
      type="button"
      aria-label={isUserSpeaking ? 'Stop listening' : 'Use voice'}
      onClick={toggleRecording}
      className="relative focus:outline-none focus-visible:ring-1 focus-visible:ring-border-accent rounded-full w-[30px] h-[30px] flex items-center justify-center"
    >
      {isUserSpeaking ? (
        <StopSvg aria-hidden="true" className="text-text-accent" />
      ) : (
        <RecordSvg aria-hidden="true" />
      )}
      {isUserSpeaking && (
        <div
          aria-hidden="true"
          className="absolute left-0 border-4 border-text-accent rounded-full pulse-ring bg-transparent size-[30px]"
        />
      )}
    </button>
  )

  if (!showModelPicker) {
    return micButton
  }

  return (
    <div className="flex items-center">
      {micButton}
      <button
        type="button"
        aria-label="Select STT model"
        onClick={handleCaretClick}
        data-tooltip-id="react-tooltip"
        data-tooltip-content={`STT model: ${selectedModel}`}
        className="flex items-center justify-center w-[18px] h-[30px] focus:outline-none text-text-quaternary hover:text-text-primary transition-colors"
      >
        <ChevronDownSvg aria-hidden="true" className="w-3 h-3" />
      </button>

      <OverlayPanel
        ref={panelRef}
        className="bg-surface-base-secondary rounded-lg border border-border-structural shadow-xl p-0 overflow-hidden"
      >
        <div className="flex flex-col min-w-40 max-w-64 py-1">
          {sttModels!.map((model) => (
            <button
              key={model.value}
              type="button"
              onClick={() => handleModelSelect(model.value)}
              title={model.label}
              className={cn(
                'w-full px-3 py-2 text-sm text-left truncate transition-colors',
                'hover:bg-surface-elevated cursor-pointer',
                model.value === selectedModel
                  ? 'text-action-primary-solid font-medium'
                  : 'text-text-primary'
              )}
            >
              {model.label}
            </button>
          ))}
        </div>
      </OverlayPanel>
    </div>
  )
}

export default ChatPromptVoiceRecorder
