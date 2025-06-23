'use client'

import { useState } from 'react'
import { Language } from '@/types'
import VoiceInput from './VoiceInput'

interface InputFieldProps {
  field: string
  label: string
  onSubmit: (value: string) => void
  language: Language
  isLarge?: boolean
  isHighContrast?: boolean
  onVoiceResult?: (text: string) => void
  isRecording?: boolean
  onStartRecording?: () => void
  onStopRecording?: () => void
  voiceError?: string | null
  isVoiceSupported?: boolean
  onUserInteraction?: () => void
}

export default function InputField({ 
  field, 
  label, 
  onSubmit, 
  language,
  isLarge = false,
  isHighContrast = false,
  onVoiceResult,
  isRecording = false,
  onStartRecording,
  onStopRecording,
  voiceError,
  isVoiceSupported = false,
  onUserInteraction
}: InputFieldProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const handleVoiceResult = (text: string) => {
    setValue(text)
    onVoiceResult?.(text)
  }

  const handleSubmit = () => {
    onUserInteraction?.() // Stop voice when submitting
    
    if (!value.trim()) {
      setError(language === 'ja' ? '入力してください' : 'Please enter a value')
      return
    }
    
    // 金額フィールドの場合、数値チェック
    if (field.includes('Amount')) {
      const numValue = parseInt(value.replace(/[^\d]/g, ''))
      if (isNaN(numValue) || numValue <= 0) {
        setError(language === 'ja' ? '正しい金額を入力してください' : 'Please enter a valid amount')
        return
      }
    }
    
    setError('')
    onSubmit(value)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
    setError('')
    onUserInteraction?.() // Stop voice when user starts typing
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  const isAmountField = field.includes('Amount')
  const placeholder = language === 'ja' 
    ? isAmountField 
      ? '例: 10000'
      : field === 'accountNumber' 
        ? '例: 1234567'
        : '入力してください'
    : isAmountField
      ? 'e.g. 10000'
      : field === 'accountNumber'
        ? 'e.g. 1234567'
        : 'Please enter'

  return (
    <div className="mt-4">
      <label className={`
        block font-medium mb-2
        ${isLarge ? 'text-lg' : 'text-base'}
        ${isHighContrast ? 'text-black' : 'text-gray-700 dark:text-gray-300'}
      `}>
        {label}
      </label>
      
      <div className="flex gap-3">
        <input
          type={isAmountField ? 'number' : 'text'}
          value={value}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className={`
            flex-1 px-4 py-3 rounded-lg border
            ${isHighContrast
              ? 'border-2 border-black bg-white text-black'
              : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
            }
            ${isLarge ? 'text-lg' : 'text-base'}
            focus:outline-none
            dark:bg-gray-700 dark:border-gray-600 dark:text-white
          `}
        />
        
        <button
          onClick={handleSubmit}
          className={`
            px-6 py-3 rounded-lg font-medium transition-all duration-200
            ${isHighContrast
              ? 'bg-black text-white hover:bg-gray-800'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
            }
            ${isLarge ? 'text-lg' : 'text-base'}
            focus:outline-none focus:ring-4 focus:ring-blue-300
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          disabled={!value.trim()}
        >
          {language === 'ja' ? '確定' : 'Submit'}
        </button>
      </div>
      
      {error && (
        <p className={`
          mt-2 text-red-500
          ${isLarge ? 'text-base' : 'text-sm'}
        `}>
          {error}
        </p>
      )}
      
      {isAmountField && (
        <p className={`
          mt-2
          ${isLarge ? 'text-sm' : 'text-xs'}
          ${isHighContrast ? 'text-black' : 'text-gray-500 dark:text-gray-400'}
        `}>
          {language === 'ja' 
            ? '※ 20万円以下の金額を入力してください'
            : '※ Please enter an amount of ¥200,000 or less'
          }
        </p>
      )}

      {/* Voice Input */}
      {isVoiceSupported && onStartRecording && onStopRecording && (
        <div className="mt-4">
          <VoiceInput
            language={language}
            isLarge={isLarge}
            isHighContrast={isHighContrast}
            onVoiceResult={handleVoiceResult}
            isRecording={isRecording}
            onStartRecording={onStartRecording}
            onStopRecording={onStopRecording}
            error={voiceError}
            isSupported={isVoiceSupported}
          />
        </div>
      )}
    </div>
  )
}