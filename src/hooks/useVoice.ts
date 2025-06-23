'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Language } from '@/types'
import { 
  VoiceRecognitionService, 
  createVoiceRecognitionService
} from '@/services/voiceRecognitionService'
import { 
  VoiceOutputService,
  createVoiceOutputService 
} from '@/services/voiceOutputService'

interface UseVoiceOptions {
  language: Language
  autoStopSeconds?: number
  volume?: number
  speechRate?: number
  onSpeechResult?: (text: string) => void
  onSpeechStart?: () => void
  onSpeechEnd?: () => void
  onError?: (error: string) => void
}

interface UseVoiceReturn {
  // Recognition
  isRecording: boolean
  isRecognitionSupported: boolean
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  
  // Output
  isSpeaking: boolean
  isOutputSupported: boolean
  speak: (text: string, voiceFile?: string) => Promise<void>
  stopSpeaking: () => void
  
  // Combined
  isVoiceActive: boolean
  error: string | null
  clearError: () => void
  
  // Settings
  setVolume: (volume: number) => void
  setSpeechRate: (rate: number) => void
}

export function useVoice(options: UseVoiceOptions): UseVoiceReturn {
  const {
    language,
    autoStopSeconds = 3,
    volume = 1.0,
    speechRate = 1.0,
    onSpeechResult,
    onSpeechStart,
    onSpeechEnd,
    onError
  } = options

  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const recognitionServiceRef = useRef<VoiceRecognitionService | null>(null)
  const outputServiceRef = useRef<VoiceOutputService | null>(null)
  const autoStopTimerRef = useRef<NodeJS.Timeout | null>(null)
  const silenceDetectionRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize recognition service (try Vosk first, fallback to Web Speech API)
        recognitionServiceRef.current = createVoiceRecognitionService(true)
        try {
          await recognitionServiceRef.current.initialize(language)
        } catch (voskError) {
          console.warn('Vosk initialization failed, falling back to Web Speech API:', voskError)
          // Fallback to Web Speech API
          recognitionServiceRef.current = createVoiceRecognitionService(false)
          await recognitionServiceRef.current.initialize(language)
        }

        // Initialize output service (audio file based)
        outputServiceRef.current = createVoiceOutputService()
        outputServiceRef.current.setVolume(volume)
        outputServiceRef.current.setRate(speechRate)

        setIsInitialized(true)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize voice services'
        setError(errorMessage)
        onError?.(errorMessage)
      }
    }

    initializeServices()

    return () => {
      // Cleanup on unmount
      recognitionServiceRef.current?.cleanup()
      outputServiceRef.current?.stop()
      const autoStopTimer = autoStopTimerRef.current
      const silenceDetectionTimer = silenceDetectionRef.current
      if (autoStopTimer) {
        clearTimeout(autoStopTimer)
      }
      if (silenceDetectionTimer) {
        clearTimeout(silenceDetectionTimer)
      }
    }
  }, [language, volume, speechRate, onError])

  // Start recording
  const startRecording = useCallback(async () => {
    if (!isInitialized || !recognitionServiceRef.current || isRecording) return

    try {
      setError(null)
      
      // Stop any current speech output
      if (outputServiceRef.current?.isSpeaking()) {
        outputServiceRef.current.stop()
        setIsSpeaking(false)
      }

      await recognitionServiceRef.current.startRecording()
      setIsRecording(true)
      onSpeechStart?.()

      // Set up auto-stop timer
      if (autoStopSeconds > 0) {
        autoStopTimerRef.current = setTimeout(() => {
          stopRecording()
        }, autoStopSeconds * 1000)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording'
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }, [isInitialized, isRecording, autoStopSeconds, onSpeechStart, onError])

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!recognitionServiceRef.current || !isRecording) return

    try {
      const result = await recognitionServiceRef.current.stopRecording()
      setIsRecording(false)
      onSpeechEnd?.()

      // Clear auto-stop timer
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current)
        autoStopTimerRef.current = null
      }

      // Process result
      if (result.trim()) {
        onSpeechResult?.(result.trim())
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop recording'
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }, [isRecording, onSpeechEnd, onSpeechResult, onError])

  // Speak text
  const speak = useCallback(async (text: string, voiceFile?: string) => {
    if (!outputServiceRef.current || !text.trim()) return

    try {
      setError(null)
      
      // Stop any currently playing audio before starting new one
      if (outputServiceRef.current.isSpeaking()) {
        outputServiceRef.current.stop()
        setIsSpeaking(false)
        // Wait briefly to ensure audio is fully stopped
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      setIsSpeaking(true)

      // Use the audio key if provided
      await outputServiceRef.current.speak(text, language, voiceFile)

      setIsSpeaking(false)
    } catch (err) {
      setIsSpeaking(false)
      const errorMessage = err instanceof Error ? err.message : 'Failed to speak text'
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }, [language, onError])

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (outputServiceRef.current) {
      outputServiceRef.current.stop()
      setIsSpeaking(false)
    }
  }, [])

  // Update volume
  const setVolume = useCallback((newVolume: number) => {
    if (outputServiceRef.current) {
      outputServiceRef.current.setVolume(newVolume)
    }
  }, [])

  // Update speech rate
  const setSpeechRate = useCallback((rate: number) => {
    if (outputServiceRef.current) {
      outputServiceRef.current.setRate(rate)
    }
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Check if services are supported
  const isRecognitionSupported = recognitionServiceRef.current?.isSupported() ?? false
  const isOutputSupported = outputServiceRef.current?.isSupported() ?? false
  const isVoiceActive = isRecording || isSpeaking

  return {
    // Recognition
    isRecording,
    isRecognitionSupported,
    startRecording,
    stopRecording,
    
    // Output
    isSpeaking,
    isOutputSupported,
    speak,
    stopSpeaking,
    
    // Combined
    isVoiceActive,
    error,
    clearError,
    
    // Settings
    setVolume,
    setSpeechRate
  }
}