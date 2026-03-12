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
import { FC, MouseEvent, useEffect, useRef, useState } from 'react'

import RecordSvg from '@/assets/icons/record.svg?react'
import StopSvg from '@/assets/icons/stop.svg?react'
import { chatsStore } from '@/store/chats'

const MICROPHONE_TIMEOUT = 10000

interface ChatPromptVoiceRecorderProps {
  onTextReady: (text: string) => void
}

const ChatPromptVoiceRecorder: FC<ChatPromptVoiceRecorderProps> = ({ onTextReady }) => {
  const audioChunks = useRef<Blob[]>([])
  const recorder = useRef<MediaRecorder | null>(null)
  const timeoutId = useRef<number | null>(null)

  const [isUserSpeaking, setIsUserSpeaking] = useState(false)

  const processSpeech = async (blob: Blob) => {
    try {
      const response = await chatsStore.recognizeSpeech(blob)

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

  return (
    <button
      type="button"
      onClick={toggleRecording}
      className="relative focus:outline-none w-[30px] h-[30px] flex items-center justify-center"
    >
      {isUserSpeaking ? <StopSvg className="text-text-accent" /> : <RecordSvg />}
      {isUserSpeaking && (
        <div className="absolute left-0 border-4 border-text-accent rounded-full pulse-ring bg-transparent size-[30px]" />
      )}
    </button>
  )
}

export default ChatPromptVoiceRecorder
