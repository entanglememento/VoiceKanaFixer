'use client'

import { Language } from '@/types'

export interface AudioFileService {
  loadAudio(audioKey: string, language: Language): Promise<HTMLAudioElement>
  preloadAudio(audioKey: string, language: Language): Promise<boolean>
  playAudio(audioKey: string, language: Language): Promise<void>
  stopAudio(): void
  isAudioAvailable(audioKey: string, language: Language): boolean
  setVolume(volume: number): void
  getAudioUrl(audioKey: string, language: Language): string
}

export class WebAudioFileService implements AudioFileService {
  private audioCache: Map<string, HTMLAudioElement> = new Map()
  private currentAudio: HTMLAudioElement | null = null
  private volume: number = 1.0
  private _isPlaying: boolean = false

  constructor() {
    // Initialize audio cache
    this.preloadCommonAudio()
  }

  private async preloadCommonAudio(): Promise<void> {
    // Preload common audio files
    const commonAudioKeys = [
      'welcome',
      'menu',
      'thank_you',
      'goodbye',
      'error',
      'please_wait'
    ]

    const languages: Language[] = ['ja', 'en']

    for (const language of languages) {
      for (const audioKey of commonAudioKeys) {
        try {
          await this.preloadAudio(audioKey, language)
        } catch {
          // Silent fail for missing audio files
          console.warn(`Failed to preload audio: ${audioKey}_${language}`)
        }
      }
    }
  }

  getAudioUrl(audioKey: string, language: Language): string {
    return `/audio/${language}/${audioKey}.wav`
  }

  private getCacheKey(audioKey: string, language: Language): string {
    return `${audioKey}_${language}`
  }

  async loadAudio(audioKey: string, language: Language): Promise<HTMLAudioElement> {
    const cacheKey = this.getCacheKey(audioKey, language)
    
    // Check if already cached
    if (this.audioCache.has(cacheKey)) {
      return this.audioCache.get(cacheKey)!
    }

    const audioUrl = this.getAudioUrl(audioKey, language)
    const audio = new Audio(audioUrl)
    
    // Set audio properties
    audio.volume = this.volume
    audio.preload = 'auto'
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Audio load timeout: ${audioKey}`))
      }, 5000)

      audio.onloadeddata = () => {
        clearTimeout(timeoutId)
        this.audioCache.set(cacheKey, audio)
        resolve(audio)
      }

      audio.onerror = () => {
        clearTimeout(timeoutId)
        reject(new Error(`Failed to load audio: ${audioKey}`))
      }

      // Start loading
      audio.load()
    })
  }

  async preloadAudio(audioKey: string, language: Language): Promise<boolean> {
    try {
      await this.loadAudio(audioKey, language)
      return true
    } catch (error) {
      console.warn(`Failed to preload audio: ${audioKey}_${language}`, error)
      return false
    }
  }

  async playAudio(audioKey: string, language: Language): Promise<void> {
    // Stop any currently playing audio
    this.stopAudio()

    try {
      const audio = await this.loadAudio(audioKey, language)
      
      // Reset audio to beginning
      audio.currentTime = 0
      audio.volume = this.volume

      return new Promise((resolve, reject) => {
        let resolved = false

        const onEnded = () => {
          this._isPlaying = false
          this.currentAudio = null
          if (!resolved) {
            resolved = true
            resolve()
          }
          cleanup()
        }

        const onError = () => {
          this._isPlaying = false
          this.currentAudio = null
          if (!resolved) {
            resolved = true
            reject(new Error(`Audio playback failed: ${audioKey}`))
          }
          cleanup()
        }

        const cleanup = () => {
          audio.removeEventListener('ended', onEnded)
          audio.removeEventListener('error', onError)
        }

        audio.addEventListener('ended', onEnded)
        audio.addEventListener('error', onError)

        // Set timeout to prevent hanging
        setTimeout(() => {
          if (!resolved) {
            resolved = true
            this.stopAudio()
            resolve()
          }
        }, 30000)

        this.currentAudio = audio
        this._isPlaying = true
        
        audio.play().catch(onError)
      })
    } catch (error) {
      throw new Error(`Failed to play audio: ${audioKey}. ${error}`)
    }
  }

  stopAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
      this.currentAudio = null
    }
    this._isPlaying = false
  }

  isAudioAvailable(audioKey: string, language: Language): boolean {
    const cacheKey = this.getCacheKey(audioKey, language)
    return this.audioCache.has(cacheKey)
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))
    
    // Update current audio volume
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume
    }

    // Update cached audio volumes
    this.audioCache.forEach(audio => {
      audio.volume = this.volume
    })
  }

  isPlaying(): boolean {
    return this._isPlaying
  }

  // Utility method to get all available audio keys for a language
  getAvailableAudioKeys(language: Language): string[] {
    const keys: string[] = []
    this.audioCache.forEach((_, cacheKey) => {
      if (cacheKey.endsWith(`_${language}`)) {
        keys.push(cacheKey.replace(`_${language}`, ''))
      }
    })
    return keys
  }

  // Clear cache to free memory
  clearCache(): void {
    this.audioCache.forEach(audio => {
      audio.pause()
      audio.src = ''
    })
    this.audioCache.clear()
    this.currentAudio = null
    this._isPlaying = false
  }
}

// Factory function to create audio file service
export function createAudioFileService(): AudioFileService {
  return new WebAudioFileService()
}