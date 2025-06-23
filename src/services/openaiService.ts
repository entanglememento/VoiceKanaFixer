'use client'

export interface OpenAIService {
  translateText(text: string, targetLanguage: 'ja' | 'en', context?: string): Promise<string>
  translateBatch(texts: string[], targetLanguage: 'ja' | 'en', context?: string): Promise<string[]>
  generateVoiceScript(content: string, language: 'ja' | 'en'): Promise<string>
  isAvailable(): boolean
}

export interface TranslationRequest {
  text: string
  targetLanguage: 'ja' | 'en'
  context?: string
  sourceLanguage?: 'ja' | 'en'
}

export interface TranslationResponse {
  translatedText: string
  confidence: number
  originalText: string
  tokensUsed: {
    input: number
    output: number
  }
}

export class WebOpenAIService implements OpenAIService {
  private apiKey: string
  private baseUrl: string
  private model: string

  constructor(apiKey?: string, model: string = 'gpt-3.5-turbo') {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''
    this.baseUrl = 'https://api.openai.com/v1'
    this.model = model
  }

  isAvailable(): boolean {
    return !!this.apiKey
  }

  private getTranslationPrompt(targetLanguage: 'ja' | 'en', context?: string): string {
    const contextPrompt = context ? `\n\nContext: This text is used in ${context}` : ''
    
    if (targetLanguage === 'en') {
      return `You are a professional translator specializing in customer service and retail environments. 
Translate the following Japanese text to natural, polite English suitable for customer-facing applications.
Maintain the tone and level of politeness appropriate for customer service.
Return only the translated text without any explanations.${contextPrompt}`
    } else {
      return `You are a professional translator specializing in customer service and retail environments.
Translate the following English text to natural, polite Japanese suitable for customer-facing applications.
Maintain the tone and level of politeness appropriate for customer service (丁寧語).
Return only the translated text without any explanations.${contextPrompt}`
    }
  }

  async translateText(
    text: string, 
    targetLanguage: 'ja' | 'en', 
    context?: string
  ): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key is not configured')
    }

    try {
      const systemPrompt = this.getTranslationPrompt(targetLanguage, context)
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: text
            }
          ],
          max_tokens: 1000,
          temperature: 0.3,
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.choices || !data.choices[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI API')
      }

      return data.choices[0].message.content.trim()
    } catch (error) {
      console.error('OpenAI translation failed:', error)
      throw error
    }
  }

  async translateBatch(
    texts: string[], 
    targetLanguage: 'ja' | 'en', 
    context?: string
  ): Promise<string[]> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key is not configured')
    }

    try {
      const systemPrompt = this.getTranslationPrompt(targetLanguage, context)
      const batchText = texts.map((text, index) => `${index + 1}. ${text}`).join('\n')
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt + '\n\nTranslate each numbered item and return them in the same numbered format.'
            },
            {
              role: 'user',
              content: batchText
            }
          ],
          max_tokens: 2000,
          temperature: 0.3,
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.choices || !data.choices[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI API')
      }

      const translatedText = data.choices[0].message.content.trim()
      
      // Parse numbered responses back to array
      const lines = translatedText.split('\n')
      const translations: string[] = []
      
      for (const line of lines) {
        const match = line.match(/^\d+\.\s*(.+)$/)
        if (match) {
          translations.push(match[1].trim())
        }
      }

      // Fallback if parsing fails
      if (translations.length !== texts.length) {
        console.warn('Batch translation parsing failed, falling back to individual translations')
        const individualTranslations = await Promise.all(
          texts.map(text => this.translateText(text, targetLanguage, context))
        )
        return individualTranslations
      }

      return translations
    } catch (error) {
      console.error('OpenAI batch translation failed:', error)
      throw error
    }
  }

  async generateVoiceScript(content: string, language: 'ja' | 'en'): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key is not configured')
    }

    try {
      const systemPrompt = language === 'ja' 
        ? `あなたは音声合成用のテキスト最適化の専門家です。
以下のテキストを音声合成（VOICEVOX）で自然に読み上げられるように最適化してください。
- 読みにくい漢字にはひらがなを併記
- 句読点を適切に配置
- 音声として聞きやすいリズムに調整
- 敬語や丁寧語を維持
最適化されたテキストのみを返してください。`
        : `You are a text optimization specialist for speech synthesis.
Optimize the following text to be naturally read by text-to-speech systems.
- Add appropriate pauses and punctuation
- Ensure natural rhythm and flow
- Maintain polite and professional tone
- Make it sound conversational when spoken
Return only the optimized text.`

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: content
            }
          ],
          max_tokens: 500,
          temperature: 0.3,
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.choices || !data.choices[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI API')
      }

      return data.choices[0].message.content.trim()
    } catch (error) {
      console.error('OpenAI voice script generation failed:', error)
      throw error
    }
  }

  // Calculate estimated cost for translation
  estimateTranslationCost(texts: string[], model: string = 'gpt-3.5-turbo'): number {
    const totalChars = texts.join('').length
    const estimatedTokens = Math.ceil(totalChars / 3) // Rough estimation
    
    // Pricing as of 2024 (per 1K tokens)
    const pricing = {
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 }
    }
    
    const cost = pricing[model as keyof typeof pricing] || pricing['gpt-3.5-turbo']
    return (estimatedTokens * cost.input + estimatedTokens * cost.output) / 1000
  }
}

// Factory function
export function createOpenAIService(apiKey?: string, model?: string): OpenAIService {
  return new WebOpenAIService(apiKey, model)
}

// Translation context constants
export const TRANSLATION_CONTEXTS = {
  CUSTOMER_SERVICE: 'customer service interactions',
  ATM_INTERFACE: 'ATM user interface',
  BANKING_SERVICES: 'banking and financial services',
  GENERAL_INQUIRY: 'general customer inquiries',
  ERROR_MESSAGES: 'error and warning messages',
  CONFIRMATION: 'confirmation and verification dialogs'
} as const