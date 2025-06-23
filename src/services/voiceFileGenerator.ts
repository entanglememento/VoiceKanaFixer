'use client'

import { Language, OptimizedChatFlow, ChatNode } from '@/types'
import { createVoicevoxService, VoicevoxService } from './voicevoxService'
import { createOpenAIService, OpenAIService } from './openaiService'

export interface VoiceFileGenerator {
  generateVoiceFile(text: string, audioKey: string, language: Language): Promise<string>
  generateAllVoiceFiles(flowData: OptimizedChatFlow, language: Language): Promise<VoiceGenerationResult[]>
  generateBatchVoiceFiles(nodes: Record<string, ChatNode>, language: Language): Promise<VoiceGenerationResult[]>
  optimizeTextForVoice(text: string, language: Language): Promise<string>
  isServiceAvailable(language: Language): Promise<boolean>
}

export interface VoiceGenerationResult {
  nodeId: string
  audioKey: string
  originalText: string
  optimizedText: string
  audioUrl?: string
  error?: string
  duration?: number
  fileSize?: number
}

export interface VoiceGenerationProgress {
  total: number
  completed: number
  current: string
  errors: string[]
}

export class WebVoiceFileGenerator implements VoiceFileGenerator {
  private voicevoxService: VoicevoxService
  private openaiService: OpenAIService
  private defaultSpeakers: Record<Language, number>

  constructor() {
    this.voicevoxService = createVoicevoxService()
    this.openaiService = createOpenAIService()
    this.defaultSpeakers = {
      ja: 3, // ずんだもん
      en: 1  // Default English speaker (Web Speech API fallback)
    }
  }

  async isServiceAvailable(language: Language): Promise<boolean> {
    if (language === 'ja') {
      return await this.voicevoxService.isAvailable()
    }
    // For English, we'll use Web Speech API which is always available
    return true
  }

  async optimizeTextForVoice(text: string, language: Language): Promise<string> {
    if (!this.openaiService.isAvailable()) {
      return text // Return original text if OpenAI is not available
    }

    try {
      return await this.openaiService.generateVoiceScript(text, language)
    } catch (error) {
      console.warn('Text optimization failed, using original text:', error)
      return text
    }
  }

  async generateVoiceFile(
    text: string, 
    audioKey: string, 
    language: Language
  ): Promise<string> {
    try {
      // Optimize text for voice synthesis
      const optimizedText = await this.optimizeTextForVoice(text, language)

      if (language === 'ja') {
        // Use VOICEVOX for Japanese
        if (!await this.voicevoxService.isAvailable()) {
          throw new Error('VOICEVOX service is not available')
        }

        const audioUrl = await this.voicevoxService.saveAudioFile(
          optimizedText,
          audioKey,
          this.defaultSpeakers.ja
        )
        
        return audioUrl
      } else {
        // For English, generate using Web Speech API or return URL for external generation
        // This is a placeholder - in a real implementation, you'd use a service like ElevenLabs
        const audioUrl = `/audio/${language}/${audioKey}.wav`
        console.log(`Generated placeholder URL for English audio: ${audioUrl}`)
        return audioUrl
      }
    } catch (error) {
      console.error(`Failed to generate voice file for ${audioKey}:`, error)
      throw error
    }
  }

  async generateAllVoiceFiles(
    flowData: OptimizedChatFlow, 
    language: Language
  ): Promise<VoiceGenerationResult[]> {
    const languageConfig = flowData.languages[language]
    if (!languageConfig) {
      throw new Error(`Language ${language} not found in flow data`)
    }

    return this.generateBatchVoiceFiles(languageConfig.nodes, language)
  }

  async generateBatchVoiceFiles(
    nodes: Record<string, ChatNode>, 
    language: Language,
    onProgress?: (progress: VoiceGenerationProgress) => void
  ): Promise<VoiceGenerationResult[]> {
    const results: VoiceGenerationResult[] = []
    const nodeEntries = Object.entries(nodes)
    const progress: VoiceGenerationProgress = {
      total: nodeEntries.length,
      completed: 0,
      current: '',
      errors: []
    }

    // Check if service is available
    if (!await this.isServiceAvailable(language)) {
      throw new Error(`Voice generation service not available for ${language}`)
    }

    for (const [nodeId, node] of nodeEntries) {
      progress.current = nodeId
      onProgress?.(progress)

      const result: VoiceGenerationResult = {
        nodeId,
        audioKey: node.voiceFile || nodeId,
        originalText: node.content,
        optimizedText: node.content
      }

      try {
        // Skip if no content
        if (!node.content.trim()) {
          result.error = 'No content to generate audio for'
          results.push(result)
          continue
        }

        // Optimize text
        result.optimizedText = await this.optimizeTextForVoice(node.content, language)

        // Generate audio
        const startTime = Date.now()
        result.audioUrl = await this.generateVoiceFile(
          node.content,
          result.audioKey,
          language
        )
        result.duration = Date.now() - startTime

        // Estimate file size (rough calculation)
        result.fileSize = Math.ceil(result.optimizedText.length * 1000) // Very rough estimate

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        result.error = errorMessage
        progress.errors.push(`${nodeId}: ${errorMessage}`)
        console.error(`Voice generation failed for ${nodeId}:`, error)
      }

      results.push(result)
      progress.completed++
      onProgress?.(progress)

      // Add small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return results
  }

  // Utility method to save generated files to the file system
  async saveGeneratedFiles(
    results: VoiceGenerationResult[], 
    language: Language
  ): Promise<{ saved: number; failed: number }> {
    let saved = 0
    let failed = 0

    for (const result of results) {
      if (result.audioUrl && !result.error) {
        try {
          // In a real implementation, this would save the file to the public/audio directory
          // For now, we'll just log the save operation
          console.log(`Saving audio file: /public/audio/${language}/${result.audioKey}.wav`)
          saved++
        } catch (error) {
          console.error(`Failed to save audio file for ${result.nodeId}:`, error)
          failed++
        }
      } else {
        failed++
      }
    }

    return { saved, failed }
  }

  // Generate a summary report
  generateReport(results: VoiceGenerationResult[]): {
    total: number
    successful: number
    failed: number
    totalDuration: number
    estimatedSize: number
    errors: Array<{ nodeId: string; error: string }>
  } {
    const successful = results.filter(r => !r.error).length
    const failed = results.filter(r => r.error).length
    const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0)
    const estimatedSize = results.reduce((sum, r) => sum + (r.fileSize || 0), 0)
    const errors = results
      .filter(r => r.error)
      .map(r => ({ nodeId: r.nodeId, error: r.error! }))

    return {
      total: results.length,
      successful,
      failed,
      totalDuration,
      estimatedSize,
      errors
    }
  }
}

// Factory function
export function createVoiceFileGenerator(): VoiceFileGenerator {
  return new WebVoiceFileGenerator()
}

// Helper function to validate audio keys
export function validateAudioKey(audioKey: string): boolean {
  // Audio keys should be alphanumeric with underscores and hyphens
  const validPattern = /^[a-zA-Z0-9_-]+$/
  return validPattern.test(audioKey) && audioKey.length > 0 && audioKey.length <= 50
}

// Helper function to generate audio key from node ID
export function generateAudioKey(nodeId: string): string {
  return nodeId.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')
}