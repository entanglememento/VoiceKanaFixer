'use client'

import { useState, useEffect } from 'react'
import { Language } from '@/types'

interface VoiceInputProps {
  language: Language
  isLarge?: boolean
  isHighContrast?: boolean
  onVoiceResult?: (text: string) => void
  onVoiceStart?: () => void
  onVoiceEnd?: () => void
  isRecording: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  error?: string | null
  isSupported?: boolean
}

export default function VoiceInput({
  language,
  isLarge = false,
  isHighContrast = false,
  onVoiceStart,
  onVoiceEnd,
  isRecording,
  onStartRecording,
  onStopRecording,
  error,
  isSupported = true
}: VoiceInputProps) {
  const [recordingTime, setRecordingTime] = useState(0)

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isRecording) {
      setRecordingTime(0)
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      setRecordingTime(0)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording])

  const handleMicClick = () => {
    if (isRecording) {
      onStopRecording()
      onVoiceEnd?.()
    } else {
      onStartRecording()
      onVoiceStart?.()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isSupported) {
    return (
      <div className={`text-center p-4 ${isHighContrast ? 'text-black' : 'text-gray-500'}`}>
        <p className={isLarge ? 'text-lg' : 'text-sm'}>
          {language === 'ja' 
            ? '音声入力はサポートされていません' 
            : 'Voice input is not supported'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Microphone Button */}
      <button
        onClick={handleMicClick}
        className={`
          relative flex items-center justify-center
          ${isLarge ? 'w-20 h-20' : 'w-16 h-16'}
          rounded-full border-2 transition-all duration-200
          ${isRecording
            ? isHighContrast
              ? 'bg-red-600 border-red-800 text-white'
              : 'bg-red-500 border-red-600 text-white animate-pulse'
            : isHighContrast
              ? 'bg-white border-black text-black hover:bg-gray-100'
              : 'bg-blue-500 border-blue-600 text-white hover:bg-blue-600'
          }
          ${!isSupported ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        disabled={!isSupported}
        aria-label={language === 'ja' ? '音声入力' : 'Voice input'}
      >
        {isRecording ? (
          <svg 
            className={isLarge ? 'w-8 h-8' : 'w-6 h-6'} 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg 
            className={isLarge ? 'w-8 h-8' : 'w-6 h-6'} 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" fill="none" />
            <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" />
            <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" />
          </svg>
        )}
        
        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full animate-ping" />
        )}
      </button>

      {/* Recording status */}
      {isRecording && (
        <div className={`text-center ${isHighContrast ? 'text-black' : 'text-gray-600'}`}>
          <p className={`font-medium ${isLarge ? 'text-lg' : 'text-sm'}`}>
            {language === 'ja' ? '録音中...' : 'Recording...'}
          </p>
          <p className={`${isLarge ? 'text-base' : 'text-xs'} mt-1`}>
            {formatTime(recordingTime)}
          </p>
        </div>
      )}

      {/* Instructions */}
      {!isRecording && (
        <div className={`text-center max-w-xs ${isHighContrast ? 'text-black' : 'text-gray-500'}`}>
          <p className={isLarge ? 'text-base' : 'text-sm'}>
            {language === 'ja' 
              ? 'マイクボタンを押して話してください' 
              : 'Press the microphone button to speak'}
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className={`text-center max-w-xs ${isHighContrast ? 'text-red-800' : 'text-red-500'}`}>
          <p className={isLarge ? 'text-base' : 'text-sm'}>
            {language === 'ja' 
              ? `エラー: ${error}`
              : `Error: ${error}`}
          </p>
        </div>
      )}

      {/* Voice level indicator (placeholder for future implementation) */}
      {isRecording && (
        <div className="flex space-x-1 items-end h-6">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`
                w-1 bg-current rounded-full animate-pulse
                ${isHighContrast ? 'text-black' : 'text-blue-500'}
              `}
              style={{
                height: `${Math.random() * 20 + 8}px`,
                animationDelay: `${i * 100}ms`
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}