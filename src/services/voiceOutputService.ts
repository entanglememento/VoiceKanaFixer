'use client'

import { Language } from '@/types'
import { createAudioFileDetector } from './audioFileDetector'

export interface VoiceOutputService {
  speak(text: string, language: Language, audioKey?: string): Promise<void>
  stop(): void
  isSupported(): boolean
  isSpeaking(): boolean
  setVolume(volume: number): void
  setRate(rate: number): void
}

export class AudioFileVoiceOutputService implements VoiceOutputService {
  private currentAudio: HTMLAudioElement | null = null
  private volume = 1.0
  private rate = 1.0
  private speaking = false

  constructor() {
    // Audio files are always supported in browsers
  }

  async speak(text: string, language: Language, audioKey?: string): Promise<void> {
    if (!text.trim()) {
      return Promise.resolve()
    }

    // Stop any current audio
    this.stop()

    return new Promise((resolve) => {
      this.playAudioFile(audioKey, language)
        .then(() => resolve())
        .catch((error) => {
          console.warn(`音声ファイル再生エラー: ${error.message}`)
          // 音声ファイルが見つからない場合は、エラーを出さずに正常終了
          resolve()
        })
    })
  }

  private async playAudioFile(audioKey?: string, language: Language = 'ja'): Promise<void> {
    if (!audioKey) {
      console.log('音声キーが提供されていません - 音声再生をスキップします')
      return Promise.resolve()
    }

    const detector = createAudioFileDetector()
    const audioFiles = await detector.detectAudioFilesForNode(audioKey, language)
    const bestFile = detector.selectBestAudioFile(audioFiles)

    if (!bestFile) {
      console.log(`音声ファイルが見つかりません (キー: ${audioKey}) - 音声再生をスキップします`)
      return Promise.resolve()
    }

    console.log(`音声ファイルを再生中: ${bestFile.url}`)

    return new Promise((resolve, reject) => {
      const audio = new Audio(bestFile.url)
      audio.volume = this.volume
      // Note: playbackRate doesn't work reliably on all browsers for audio files
      
      this.currentAudio = audio
      this.speaking = true

      audio.onloadeddata = () => {
        console.log('音声ファイル読み込み完了')
      }

      audio.onplay = () => {
        console.log('音声再生開始')
        this.speaking = true
      }

      audio.onended = () => {
        console.log('音声再生終了')
        this.speaking = false
        this.currentAudio = null
        resolve()
      }

      audio.onerror = (event) => {
        console.error('音声再生エラー:', event)
        this.speaking = false
        this.currentAudio = null
        reject(new Error(`Audio playback failed: ${audio.error?.message || 'Unknown error'}`))
      }

      // Start playing
      audio.play()
        .then(() => {
          console.log('音声再生開始成功')
        })
        .catch((error) => {
          console.error('音声再生開始エラー:', error)
          this.speaking = false
          this.currentAudio = null
          reject(error)
        })
    })
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
      this.currentAudio = null
    }
    this.speaking = false
  }

  isSupported(): boolean {
    return typeof Audio !== 'undefined'
  }

  isSpeaking(): boolean {
    return this.speaking
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume
    }
  }

  setRate(rate: number): void {
    this.rate = Math.max(0.1, Math.min(4, rate))
    // Note: Changing playback rate of audio files is not reliably supported
    // This is kept for interface compatibility
  }
}

// Fallback Web Speech API implementation
export class WebSpeechVoiceOutputService implements VoiceOutputService {
  private synthesis: SpeechSynthesis | null = null
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private volume = 1.0
  private rate = 1.0
  private speaking = false

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis
    }
  }

  async speak(text: string, language: Language): Promise<void> {
    if (!this.synthesis || !text.trim()) return

    // Stop any current speech
    this.stop()

    // Wait a bit to ensure previous speech is fully stopped
    await new Promise(resolve => setTimeout(resolve, 100))

    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text)
        
        // Set language
        utterance.lang = language === 'ja' ? 'ja-JP' : 'en-US'
        utterance.volume = this.volume
        utterance.rate = this.rate
        
        // Try to select appropriate voice
        const voices = this.synthesis!.getVoices()
        const preferredVoice = voices.find(voice => 
          voice.lang.startsWith(language === 'ja' ? 'ja' : 'en')
        )
        
        if (preferredVoice) {
          utterance.voice = preferredVoice
        }

        let resolved = false

        utterance.onstart = () => {
          this.speaking = true
        }

        utterance.onend = () => {
          this.speaking = false
          this.currentUtterance = null
          if (!resolved) {
            resolved = true
            resolve()
          }
        }

        utterance.onerror = (event) => {
          this.speaking = false
          this.currentUtterance = null
          
          if (event.error === 'interrupted') {
            if (!resolved) {
              resolved = true
              resolve()
            }
            return
          }
          
          console.error('Speech synthesis error:', event.error)
          if (!resolved) {
            resolved = true
            resolve() // Don't reject, just resolve to continue
          }
        }

        // Add timeout
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true
            this.stop()
            resolve()
          }
        }, 30000)

        utterance.onend = () => {
          clearTimeout(timeout)
          this.speaking = false
          this.currentUtterance = null
          if (!resolved) {
            resolved = true
            resolve()
          }
        }

        this.currentUtterance = utterance
        this.synthesis!.speak(utterance)

      } catch (error) {
        console.error('Speech synthesis setup error:', error)
        reject(error)
      }
    })
  }

  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel()
    }
    this.speaking = false
    this.currentUtterance = null
  }

  isSupported(): boolean {
    return this.synthesis !== null
  }

  isSpeaking(): boolean {
    return this.speaking
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))
  }

  setRate(rate: number): void {
    this.rate = Math.max(0.1, Math.min(4, rate))
  }
}

// Create a voice output service that tries audio files first, then falls back to Web Speech API
export function createVoiceOutputService(): VoiceOutputService {
  return new AudioFileVoiceOutputService()
}