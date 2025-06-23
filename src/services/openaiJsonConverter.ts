import { OptimizedChatFlow, OriginalConfiguration } from '@/types'

export interface OpenAIConversionResponse {
  success: boolean
  data?: OptimizedChatFlow
  error?: string
  tokensUsed?: number
  cost?: number
}

export class OpenAIJsonConverter {
  private apiKey: string
  private baseUrl = 'https://api.openai.com/v1/chat/completions'

  constructor(apiKey?: string) {
    // 1. 明示的に渡されたAPIキー
    // 2. ローカルストレージのAPIキー
    // 3. 環境変数のAPIキー
    this.apiKey = apiKey || 
                  (typeof window !== 'undefined' ? localStorage.getItem('openai_api_key') : null) ||
                  process.env.NEXT_PUBLIC_OPENAI_API_KEY || 
                  process.env.OPENAI_API_KEY || 
                  ''
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required. Please set it in Settings.')
    }
  }

  async convertConfigurationToOptimizedFlow(
    originalConfig: OriginalConfiguration
  ): Promise<OpenAIConversionResponse> {
    try {
      const response = await fetch('/api/openai/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          originalConfig
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.error) {
        return {
          success: false,
          error: result.error
        }
      }

      return {
        success: true,
        data: result.data,
        tokensUsed: result.tokensUsed,
        cost: this.calculateCost(result.tokensUsed || 0)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private createConversionPrompt(originalConfig: OriginalConfiguration): string {
    return `
Convert the following banking configuration JSON into an optimized chat flow format. The original configuration contains complex workflow definitions that need to be simplified for a conversational chatbot interface.

Requirements:
1. Create a comprehensive chat flow for banking ATM operations
2. Include Japanese and English versions with proper translations
3. Generate sophisticated keyword matching for voice/text input
4. Support deposit, withdrawal, and transfer operations
5. Include proper validation and confirmation steps
6. Add appropriate bank names and branch search functionality
7. Implement transaction limits (200,000 yen maximum)
8. Include QR code display at the end of successful transactions
9. Include staff assistance for transactions over 200,000 yen

Original Configuration:
${JSON.stringify(originalConfig, null, 2)}

Please convert this to the following OptimizedChatFlow format. Here's a complete example of the expected structure:

{
  "version": "1.0",
  "storeName": "Banking ATM Service",
  "languages": {
    "ja": {
      "languageSelection": true,
      "settings": {
        "autoStopSeconds": 3,
        "voiceSpeed": 1.0,
        "qrPassword": "1234",
        "qrExpiryMinutes": 30
      },
      "nodes": {
        "start": {
          "id": "start",
          "type": "message",
          "content": "いらっしゃいませ。ATMサービスをご利用いただき、ありがとうございます。",
          "next": "language_selection"
        },
        "language_selection": {
          "id": "language_selection",
          "type": "choice",
          "content": "言語を選択してください。",
          "choices": [
            {
              "id": "japanese",
              "text": "日本語",
              "keywords": ["日本語", "にほんご", "Japanese", "jp"],
              "excludeKeywords": [],
              "next": "transaction_type"
            },
            {
              "id": "english", 
              "text": "English",
              "keywords": ["English", "英語", "えいご", "en"],
              "excludeKeywords": [],
              "next": "transaction_type"
            }
          ]
        },
        "transaction_type": {
          "id": "transaction_type",
          "type": "choice",
          "content": "ご希望の取引を選択してください。",
          "choices": [
            {
              "id": "deposit",
              "text": "預入",
              "keywords": ["預入", "入金", "預金", "よにゅう", "deposit"],
              "excludeKeywords": ["出金", "振込"],
              "next": "deposit_amount"
            },
            {
              "id": "withdrawal",
              "text": "払出",
              "keywords": ["払出", "出金", "引き出し", "withdrawal"],
              "excludeKeywords": ["入金", "振込"],
              "next": "withdrawal_amount"
            },
            {
              "id": "transfer",
              "text": "振込",
              "keywords": ["振込", "送金", "transfer"],
              "excludeKeywords": [],
              "next": "transfer_country"
            }
          ]
        },
        "deposit_amount": {
          "id": "deposit_amount",
          "type": "input",
          "content": "預入金額を入力してください。",
          "field": "depositAmount",
          "label": "預入金額",
          "next": "deposit_confirmation"
        },
        "deposit_confirmation": {
          "id": "deposit_confirmation",
          "type": "confirmation",
          "content": "預入金額が正しいことを確認してください。",
          "field": "depositAmount",
          "label": "預入金額",
          "next": "transaction_complete"
        },
        "transaction_complete": {
          "id": "transaction_complete",
          "type": "message",
          "content": "お手続きが完了いたしました。QRコードを表示いたします。",
          "next": "qr_code_display"
        },
        "qr_code_display": {
          "id": "qr_code_display",
          "type": "message",
          "content": "QRコードが表示されました。お近くのATMでスキャンしてください",
          "next": "end_options"
        },
        "staff_assistance_amount": {
          "id": "staff_assistance_amount",
          "type": "message",
          "content": "20万円を超える取引は窓口での対応が必要です。お近くの店員をお呼びください。",
          "next": "call_staff"
        },
        "call_staff": {
          "id": "call_staff",
          "type": "message",
          "content": "店員を呼び出しています。しばらくお待ちください。",
          "next": "end_options"
        }
      }
    },
    "en": {
      "languageSelection": true,
      "settings": {
        "autoStopSeconds": 3,
        "voiceSpeed": 1.0,
        "qrPassword": "1234",
        "qrExpiryMinutes": 30
      },
      "nodes": {
        // Same structure as Japanese but with English content
      }
    }
  }
}

The response should include:
- Complete transaction flows for deposit, withdrawal, transfer based on the original configuration
- Bank selection matching the banks in the original configuration
- Branch search by name or code
- Account number input
- Amount validation with limits
- Confirmation steps for all inputs
- QR code display after successful transactions
- Staff assistance for amounts over 200,000 yen
- Rich keyword sets for natural language input
- Proper exclude keywords to avoid conflicts
- Both Japanese and English versions

Parse the original configuration carefully and create nodes that match the workflow structure defined in the configuration. Pay attention to the codedef section for bank names and transaction types.

Respond with valid JSON only.`
  }

  private calculateCost(tokens: number): number {
    // GPT-4 pricing (approximate)
    const inputCostPer1kTokens = 0.03
    const outputCostPer1kTokens = 0.06
    // Assuming roughly half input, half output
    return ((tokens / 2) * inputCostPer1kTokens + (tokens / 2) * outputCostPer1kTokens) / 1000
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  getApiKey(): string {
    return this.apiKey ? '****' + this.apiKey.slice(-4) : 'Not set'
  }
}