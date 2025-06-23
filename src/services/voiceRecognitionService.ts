'use client'

import { Language } from '@/types'

// Web Speech API type declarations
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

declare const SpeechRecognition: {
  prototype: SpeechRecognition
  new(): SpeechRecognition
}

export interface VoiceRecognitionService {
  initialize(language: Language): Promise<void>
  startRecording(): Promise<void>
  stopRecording(): Promise<string>
  isRecording(): boolean
  isSupported(): boolean
  cleanup(): void
}

// Vosk-browser implementation for offline voice recognition
export class VoskVoiceRecognitionService implements VoiceRecognitionService {
  private model: any = null
  private recognizer: any = null
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private processor: ScriptProcessorNode | null = null
  private recording = false
  private currentLanguage: Language = 'ja'
  private resolveRecording: ((value: string) => void) | null = null
  private partialResult = ''

  async initialize(language: Language): Promise<void> {
    this.currentLanguage = language
    
    try {
      // Check if we're running in a browser environment
      if (typeof window === 'undefined') {
        throw new Error('Vosk can only be used in browser environment')
      }

      // Dynamically import vosk-browser with correct destructuring
      const voskModule = await import('vosk-browser')
      console.log('Vosk module loaded:', voskModule)
      
      // Check different possible export structures
      const Model = (voskModule as any).Model || (voskModule as any).default?.Model || (voskModule as any).default
      const KaldiRecognizer = (voskModule as any).KaldiRecognizer || (voskModule as any).default?.KaldiRecognizer
      
      if (!Model || !KaldiRecognizer) {
        throw new Error('Vosk Model or KaldiRecognizer not found in imported module')
      }

      // Load the appropriate model for the language
      const modelUrl = language === 'ja' 
        ? '/models/vosk-model-small-ja-0.22.tar.gz'
        : '/models/vosk-model-small-en-us-0.15.tar.gz'
      
      console.log(`Loading Vosk model for ${language}...`)
      
      // Check if model file exists first
      const modelResponse = await fetch(modelUrl, { method: 'HEAD' })
      if (!modelResponse.ok) {
        throw new Error(`Vosk model file not found at ${modelUrl}. Please download the model files as described in /public/models/README.md`)
      }
      
      // Try different methods to create model
      if (typeof Model.createModel === 'function') {
        this.model = await Model.createModel(modelUrl)
      } else if (typeof Model === 'function') {
        this.model = await new Model(modelUrl)
      } else {
        throw new Error('Unknown Vosk Model constructor pattern')
      }
      
      // Create recognizer with sample rate of 16000 Hz
      this.recognizer = new KaldiRecognizer(this.model, 16000)
      
      console.log(`Vosk model loaded successfully for ${language}`)
    } catch (error) {
      console.error('Failed to initialize Vosk:', error)
      throw new Error(`Failed to initialize Vosk voice recognition: ${error}`)
    }
  }

  async startRecording(): Promise<void> {
    if (!this.recognizer || this.recording) return

    try {
      // Get user media
      console.log('Vosk: マイクへのアクセスを要求します')
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      })
      console.log('Vosk: マイクのアクセスが許可されました')

      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      })

      const source = this.audioContext.createMediaStreamSource(this.mediaStream)
      
      // Create script processor node for audio processing
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1)
      
      this.processor.onaudioprocess = (event: AudioProcessingEvent) => {
        if (!this.recording || !this.recognizer) return
        
        const inputBuffer = event.inputBuffer
        const inputData = inputBuffer.getChannelData(0)
        
        // Convert float32 to int16
        const buffer = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          buffer[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF
        }
        
        // Process audio data with Vosk
        if (this.recognizer.acceptWaveform(buffer)) {
          const result = this.recognizer.result()
          try {
            const parsed = JSON.parse(result)
            if (parsed.text && parsed.text.trim()) {
              this.partialResult = parsed.text.trim()
              console.log('Vosk: 認識結果:', this.partialResult)
            }
          } catch (e) {
            console.warn('Vosk: 結果のパースに失敗しました:', result)
          }
        } else {
          // Get partial result
          const partialResult = this.recognizer.partialResult()
          try {
            const parsed = JSON.parse(partialResult)
            if (parsed.partial) {
              console.log('Vosk: 中間認識結果:', parsed.partial)
            }
          } catch (e) {
            // Ignore partial result parsing errors
          }
        }
      }

      source.connect(this.processor)
      this.processor.connect(this.audioContext.destination)
      
      this.recording = true
      this.partialResult = ''
      
      console.log('Vosk: 音声認識を開始しました')
    } catch (error) {
      console.error('Vosk: 録音の開始に失敗しました:', error)
      throw new Error(`Failed to start recording: ${error}`)
    }
  }

  async stopRecording(): Promise<string> {
    if (!this.recording || !this.recognizer) return ''

    return new Promise((resolve) => {
      this.resolveRecording = resolve
      this.recording = false
      console.log('Vosk: 音声認識を停止します')
      
      try {
        // Get final result
        const finalResult = this.recognizer.finalResult()
        let finalText = this.partialResult
        
        try {
          const parsed = JSON.parse(finalResult)
          if (parsed.text && parsed.text.trim()) {
            finalText = parsed.text.trim()
            console.log('Vosk: 最終認識結果:', finalText)
          }
        } catch (e) {
          console.warn('Vosk: 最終結果のパースに失敗しました:', finalResult)
        }
        
        // Clean up audio resources
        if (this.processor) {
          this.processor.disconnect()
          this.processor = null
        }
        
        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach(track => track.stop())
          this.mediaStream = null
        }
        
        if (this.audioContext) {
          this.audioContext.close()
          this.audioContext = null
        }
        
        if (this.resolveRecording) {
          this.resolveRecording(finalText)
          this.resolveRecording = null
        }
      } catch (error) {
        console.error('Vosk: 録音の停止中にエラーが発生しました:', error)
        if (this.resolveRecording) {
          this.resolveRecording('')
          this.resolveRecording = null
        }
      }
    })
  }

  isRecording(): boolean {
    return this.recording
  }

  isSupported(): boolean {
    return !!(navigator.mediaDevices && 
             typeof navigator.mediaDevices.getUserMedia === 'function' && 
             (window.AudioContext || (window as any).webkitAudioContext))
  }

  cleanup(): void {
    this.recording = false
    
    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }
    
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    
    this.resolveRecording = null
    this.partialResult = ''
  }
}

// Fallback implementation using Web Speech API
export class WebSpeechVoiceRecognitionService implements VoiceRecognitionService {
  private recognition: SpeechRecognition | null = null
  private recording = false
  private currentLanguage: Language = 'ja'
  private resolveRecording: ((value: string) => void) | null = null

  async initialize(language: Language): Promise<void> {
    this.currentLanguage = language
    
    if (!this.isSupported()) {
      throw new Error('Web Speech API is not supported')
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
    this.recognition = new SpeechRecognition()
    
    this.recognition.continuous = true
    this.recognition.interimResults = false
    this.recognition.lang = language === 'ja' ? 'ja-JP' : 'en-US'
    
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1]
      console.log('Web Speech API: 音声認識結果:', result[0].transcript)
      if (result.isFinal && this.resolveRecording) {
        console.log('Web Speech API: 最終認識結果:', result[0].transcript)
        this.resolveRecording(result[0].transcript)
        this.resolveRecording = null
      }
    }

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Web Speech API エラー:', event.error)
      if (this.resolveRecording) {
        this.resolveRecording('')
        this.resolveRecording = null
      }
    }

    this.recognition.onend = () => {
      this.recording = false
      console.log('Web Speech API: 音声認識が終了しました')
      if (this.resolveRecording) {
        this.resolveRecording('')
        this.resolveRecording = null
      }
    }
  }

  async startRecording(): Promise<void> {
    if (!this.recognition || this.recording) return

    this.recording = true
    console.log('Web Speech API: 音声認識を開始しました')
    this.recognition?.start()
  }

  async stopRecording(): Promise<string> {
    if (!this.recognition || !this.recording) return ''

    return new Promise((resolve) => {
      this.resolveRecording = resolve
      console.log('Web Speech API: 音声認識を停止します')
      this.recognition?.stop()
      
      // Timeout after 1 second
      setTimeout(() => {
        if (this.resolveRecording) {
          console.log('Web Speech API: タイムアウトのため音声認識を終了します')
          this.resolveRecording('')
          this.resolveRecording = null
        }
      }, 1000)
    })
  }

  isRecording(): boolean {
    return this.recording
  }

  isSupported(): boolean {
    return !!(window.webkitSpeechRecognition || window.SpeechRecognition)
  }

  cleanup(): void {
    if (this.recognition) {
      this.recognition?.stop()
    }
    this.recording = false
    this.resolveRecording = null
  }
}

// Factory function to create appropriate service
export function createVoiceRecognitionService(preferVosk: boolean = true): VoiceRecognitionService {
  // Try to use Vosk first if preferred and supported, otherwise fallback to Web Speech API
  if (preferVosk && typeof window !== 'undefined' && 
      navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function' && 
      (window.AudioContext || (window as any).webkitAudioContext)) {
    try {
      return new VoskVoiceRecognitionService()
    } catch (error) {
      console.warn('Failed to create Vosk service, falling back to Web Speech API:', error)
    }
  }
  
  // Fallback to Web Speech API
  return new WebSpeechVoiceRecognitionService()
}