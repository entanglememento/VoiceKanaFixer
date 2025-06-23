'use client'

import { Language } from '@/types'

export interface AudioFileManager {
  saveAudioFile(audioBlob: Blob, audioKey: string, language: Language): Promise<string>
  getAudioUrl(audioKey: string, language: Language): string
  audioFileExists(audioKey: string, language: Language): Promise<boolean>
  downloadAudioFile(audioKey: string, audioBlob: Blob): void
  getStoredAudioKeys(language: Language): string[]
}

export class BrowserAudioFileManager implements AudioFileManager {
  private audioStorage = new Map<string, string>()
  private storageKey = 'chatbot_audio_files'
  private audioDirectory = '/audio'

  constructor() {
    this.loadStoredAudio()
  }

  private getStorageKey(audioKey: string, language: Language): string {
    return `${language}_${audioKey}`
  }

  private loadStoredAudio(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const audioData = JSON.parse(stored)
        Object.entries(audioData).forEach(([key, url]) => {
          this.audioStorage.set(key, url as string)
        })
      }
    } catch (error) {
      console.warn('音声ファイル情報の読み込みに失敗:', error)
    }
  }

  private saveStoredAudio(): void {
    try {
      const audioData: Record<string, string> = {}
      this.audioStorage.forEach((url, key) => {
        audioData[key] = url
      })
      localStorage.setItem(this.storageKey, JSON.stringify(audioData))
    } catch (error) {
      console.warn('音声ファイル情報の保存に失敗:', error)
    }
  }

  async saveAudioFile(audioBlob: Blob, audioKey: string, language: Language): Promise<string> {
    try {
      // Blob URLを作成（一時的な使用のため）
      const audioUrl = URL.createObjectURL(audioBlob)
      const storageKey = this.getStorageKey(audioKey, language)
      
      // 既存のURLがあれば解放
      const existingUrl = this.audioStorage.get(storageKey)
      if (existingUrl) {
        URL.revokeObjectURL(existingUrl)
      }

      // FormDataを作成
      const formData = new FormData()
      formData.append('audio', audioBlob, `${audioKey}.wav`)
      formData.append('language', language)

      // サーバーに音声ファイルを保存
      const response = await fetch('/api/save-audio', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('音声ファイルの保存に失敗しました')
      }

      // 永続的なURLを保存
      const permanentUrl = `${this.audioDirectory}/${language}/${audioKey}.wav`
      this.audioStorage.set(storageKey, permanentUrl)
      this.saveStoredAudio()

      console.log(`音声ファイル保存完了: ${audioKey} (${language})`)
      return audioUrl // 一時的な使用のためにBlobURLを返す

    } catch (error) {
      console.error(`音声ファイル保存失敗 ${audioKey}:`, error)
      throw error
    }
  }

  getAudioUrl(audioKey: string, language: Language): string {
    const storageKey = this.getStorageKey(audioKey, language)
    const url = this.audioStorage.get(storageKey)
    
    if (url) {
      return url
    }

    // フォールバック: public/audioディレクトリから読み込み
    return `/audio/${language}/${audioKey}.wav`
  }

  async audioFileExists(audioKey: string, language: Language): Promise<boolean> {
    const storageKey = this.getStorageKey(audioKey, language)
    
    // メモリ内にあるかチェック
    if (this.audioStorage.has(storageKey)) {
      return true
    }

    // public/audioディレクトリにあるかチェック
    try {
      const response = await fetch(`/audio/${language}/${audioKey}.wav`, { method: 'HEAD' })
      return response.ok
    } catch {
      return false
    }
  }

  downloadAudioFile(audioKey: string, audioBlob: Blob): void {
    try {
      const url = URL.createObjectURL(audioBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${audioKey}.wav`
      link.style.display = 'none'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // 少し後でURLを解放
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      
      console.log(`音声ファイルダウンロード: ${audioKey}.wav`)
    } catch (error) {
      console.error('音声ファイルダウンロード失敗:', error)
    }
  }

  getStoredAudioKeys(language: Language): string[] {
    const keys: string[] = []
    this.audioStorage.forEach((_, storageKey) => {
      if (storageKey.startsWith(`${language}_`)) {
        keys.push(storageKey.replace(`${language}_`, ''))
      }
    })
    return keys
  }

  // クリーンアップメソッド
  cleanup(): void {
    this.audioStorage.forEach((url) => {
      URL.revokeObjectURL(url)
    })
    this.audioStorage.clear()
    localStorage.removeItem(this.storageKey)
  }

  // 音声ファイル一覧を取得
  getAllAudioFiles(): Record<string, { language: Language; audioKey: string; url: string }> {
    const files: Record<string, { language: Language; audioKey: string; url: string }> = {}
    
    this.audioStorage.forEach((url, storageKey) => {
      const [language, audioKey] = storageKey.split('_', 2)
      if (language && audioKey) {
        files[storageKey] = {
          language: language as Language,
          audioKey,
          url
        }
      }
    })
    
    return files
  }

  // 特定の言語の音声ファイルを全削除
  clearLanguageAudio(language: Language): void {
    const keysToRemove: string[] = []
    
    this.audioStorage.forEach((url, storageKey) => {
      if (storageKey.startsWith(`${language}_`)) {
        URL.revokeObjectURL(url)
        keysToRemove.push(storageKey)
      }
    })
    
    keysToRemove.forEach(key => this.audioStorage.delete(key))
    this.saveStoredAudio()
    
    console.log(`${language}の音声ファイルを${keysToRemove.length}個削除しました`)
  }
}

// ファクトリー関数
export function createAudioFileManager(): AudioFileManager {
  return new BrowserAudioFileManager()
}

// 音声ファイル情報の型定義
export interface AudioFileInfo {
  audioKey: string
  language: Language
  url: string
  exists: boolean
  size?: number
  duration?: number
  speaker?: number
}