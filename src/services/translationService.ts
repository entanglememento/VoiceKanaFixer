export interface TranslationResult {
  translatedText: string
  confidence: number
  tokensUsed: {
    prompt: number
    completion: number
    total: number
  }
  cost: number
}

export interface TranslationError {
  error: string
  code?: string
}

export class TranslationService {
  async translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
    try {
      const response = await fetch('/api/openai/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          sourceLang,
          targetLang
        })
      })

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      return data.translatedText || text
    } catch (error) {
      console.error('Translation error:', error)
      return text // フォールバック：元のテキストを返す
    }
  }

  async testApiKey(): Promise<boolean> {
    try {
      const response = await fetch('/api/openai/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'test',
          sourceLang: 'en',
          targetLang: 'ja'
        })
      })

      return response.ok
    } catch {
      return false
    }
  }
}

// APIキー管理用のユーティリティ
// Note: このクラスは不要になりましたが、
// 互換性のために一時的に残しています
export class ApiKeyManager {
  private static readonly STORAGE_KEY = 'openai_api_key'
  
  static saveApiKey(): void {
    console.warn('ApiKeyManager is deprecated')
  }
  
  static getApiKey(): string | null {
    console.warn('ApiKeyManager is deprecated')
    return null
  }
  
  static removeApiKey(): void {
    console.warn('ApiKeyManager is deprecated')
  }
  
  static hasApiKey(): boolean {
    console.warn('ApiKeyManager is deprecated')
    return false
  }
}