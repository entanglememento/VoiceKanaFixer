'use client'

import { Language } from '@/types'

export interface AudioFileInfo {
  nodeId: string
  speaker: string
  filename: string
  url: string
  exists: boolean
}

export class AudioFileDetector {
  /**
   * 指定されたノードIDに対応する音声ファイルを検出
   */
  async detectAudioFilesForNode(nodeId: string, language: Language): Promise<AudioFileInfo[]> {
    const commonSpeakers = ['2', '3', '11', '22'] // よく使用される話者ID
    const audioFiles: AudioFileInfo[] = []

    for (const speaker of commonSpeakers) {
      const filename = `${nodeId}_${speaker}.wav`
      const url = `/audio/${language}/${filename}`
      
      const exists = await this.checkFileExists(url)
      
      audioFiles.push({
        nodeId,
        speaker,
        filename,
        url,
        exists
      })
    }

    // 話者なしファイルもチェック
    const plainFilename = `${nodeId}.wav`
    const plainUrl = `/audio/${language}/${plainFilename}`
    const plainExists = await this.checkFileExists(plainUrl)
    
    audioFiles.push({
      nodeId,
      speaker: 'none',
      filename: plainFilename,
      url: plainUrl,
      exists: plainExists
    })

    return audioFiles
  }

  /**
   * 利用可能な音声ファイル一覧を取得
   */
  async getAllAudioFiles(language: Language): Promise<AudioFileInfo[]> {
    // まずAPI経由で取得を試行
    try {
      const response = await fetch(`/api/audio-files?language=${language}`)
      if (response.ok) {
        const data = await response.json()
        console.log('API response:', data)
        
        if (data.success && data.files) {
          return data.files.map((file: { name: string }) => ({
            nodeId: this.extractNodeIdFromFilename(file.name),
            speaker: this.extractSpeakerFromFilename(file.name),
            filename: file.name,
            url: `/audio/${language}/${file.name}`,
            exists: true
          }))
        }
      }
    } catch (error) {
      console.warn('API呼び出しに失敗、直接チェック方式にフォールバック:', error)
    }
    
    // APIが失敗した場合、既知のパターンでファイル存在をチェック
    console.log('直接ファイル存在チェックを実行中...')
    return this.detectKnownAudioFiles(language)
  }

  /**
   * 既知のパターンで音声ファイルを検出
   */
  private async detectKnownAudioFiles(language: Language): Promise<AudioFileInfo[]> {
    // よく使用されるノードIDパターン
    const commonNodeIds = [
      'start', 'language_selection', 'transaction_type', 'amount_input',
      'confirmation', 'pin_input', 'receipt_selection', 'completion',
      'error_handling', 'card_insertion', 'service_selection'
    ]
    
    const commonSpeakers = ['2', '3', '11', '22']
    const detectedFiles: AudioFileInfo[] = []

    for (const nodeId of commonNodeIds) {
      for (const speaker of commonSpeakers) {
        const filename = `${nodeId}_${speaker}.wav`
        const url = `/audio/${language}/${filename}`
        
        const exists = await this.checkFileExists(url)
        if (exists) {
          detectedFiles.push({
            nodeId,
            speaker,
            filename,
            url,
            exists: true
          })
          console.log(`Found audio file: ${filename}`)
        }
      }
      
      // 話者なしファイルもチェック
      const plainFilename = `${nodeId}.wav`
      const plainUrl = `/audio/${language}/${plainFilename}`
      const plainExists = await this.checkFileExists(plainUrl)
      
      if (plainExists) {
        detectedFiles.push({
          nodeId,
          speaker: 'none',
          filename: plainFilename,
          url: plainUrl,
          exists: true
        })
        console.log(`Found audio file: ${plainFilename}`)
      }
    }

    console.log(`Total detected files: ${detectedFiles.length}`)
    return detectedFiles
  }

  /**
   * ファイルの存在確認
   */
  private async checkFileExists(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * ファイル名からノードIDを抽出
   */
  private extractNodeIdFromFilename(filename: string): string {
    const match = filename.match(/^(.+?)(?:_\d+)?\.wav$/)
    return match ? match[1] : filename.replace('.wav', '')
  }

  /**
   * ファイル名から話者IDを抽出
   */
  private extractSpeakerFromFilename(filename: string): string {
    const match = filename.match(/_(\d+)\.wav$/)
    return match ? match[1] : 'none'
  }

  /**
   * 最適な音声ファイルを選択
   */
  selectBestAudioFile(audioFiles: AudioFileInfo[]): AudioFileInfo | null {
    // 存在するファイルのみでフィルタ
    const existingFiles = audioFiles.filter(f => f.exists)
    
    if (existingFiles.length === 0) {
      return null
    }
    
    // 優先順位: 3 > 2 > 11 > 22 > none
    const priorityOrder = ['3', '2', '11', '22', 'none']
    
    for (const speaker of priorityOrder) {
      const file = existingFiles.find(f => f.speaker === speaker)
      if (file) {
        return file
      }
    }
    
    // フォールバック: 最初に見つかったファイル
    return existingFiles[0]
  }
}

export function createAudioFileDetector(): AudioFileDetector {
  return new AudioFileDetector()
}