import { OriginalConfiguration, OptimizedChatFlow } from '@/types'
import { ConfigurationParser } from '@/services/configurationParser'
import { TranslationService, ApiKeyManager } from '@/services/translationService'

export async function convertBankingConfigurationToFlow(
  config: OriginalConfiguration,
  enableTranslation: boolean = true
): Promise<OptimizedChatFlow> {
  const parser = new ConfigurationParser(config)
  
  let translationService: TranslationService | undefined
  
  if (enableTranslation) {
    const apiKey = ApiKeyManager.getApiKey()
    if (apiKey) {
      translationService = new TranslationService()
    }
  }
  
  const convertedFlow = await parser.convertToOptimizedFlow({
    enableTranslation: enableTranslation && !!translationService,
    translationService,
    targetLanguages: ['ja', 'en'],
    generateKeywords: true
  })
  
  return convertedFlow
}

export function getBankingFlowFromConfiguration(): OptimizedChatFlow {
  // Static banking flow based on configuration.json
  return {
    "version": "1.0",
    "storeName": "銀行ATMサービス",
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
            "content": "言語を選択してください。\nPlease select your language.",
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
              },
              {
                "id": "chinese",
                "text": "中文",
                "keywords": ["中文", "中国語", "Chinese", "zh"],
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
                "keywords": ["預入", "入金", "預金", "お預け入れ", "よにゅう", "deposit"],
                "excludeKeywords": ["出金", "引き出し"],
                "next": "deposit_amount"
              },
              {
                "id": "payment",
                "text": "払出",
                "keywords": ["払出", "出金", "引き出し", "払い出し", "ひきだし", "withdrawal"],
                "excludeKeywords": ["入金", "預入"],
                "next": "withdrawal_amount"
              },
              {
                "id": "transfer",
                "text": "振込",
                "keywords": ["振込", "送金", "振り込み", "ふりこみ", "送る", "transfer"],
                "excludeKeywords": [],
                "next": "transfer_details"
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
          "withdrawal_amount": {
            "id": "withdrawal_amount",
            "type": "input",
            "content": "払出金額を入力してください。",
            "field": "payoutAmount",
            "label": "払出金額",
            "next": "document_check"
          },
          "document_check": {
            "id": "document_check",
            "type": "choice",
            "content": "本人確認書類をご準備ください。",
            "choices": [
              {
                "id": "driver_license",
                "text": "運転免許証",
                "keywords": ["運転免許証", "免許証", "免許", "めんきょ", "driver license"],
                "excludeKeywords": [],
                "next": "withdrawal_confirmation"
              },
              {
                "id": "passport",
                "text": "パスポート",
                "keywords": ["パスポート", "旅券", "りょけん", "passport"],
                "excludeKeywords": [],
                "next": "withdrawal_confirmation"
              },
              {
                "id": "mynumber_card",
                "text": "個人番号カード",
                "keywords": ["個人番号カード", "マイナンバーカード", "マイナンバー", "mynumber"],
                "excludeKeywords": [],
                "next": "withdrawal_confirmation"
              },
              {
                "id": "health_insurance",
                "text": "健康保険証",
                "keywords": ["健康保険証", "保険証", "ほけんしょう", "health insurance"],
                "excludeKeywords": [],
                "next": "withdrawal_confirmation"
              }
            ]
          },
          "withdrawal_confirmation": {
            "id": "withdrawal_confirmation",
            "type": "confirmation",
            "content": "払出内容を確認してください。",
            "field": "payoutAmount",
            "label": "払出金額",
            "next": "transaction_complete"
          },
          "transfer_details": {
            "id": "transfer_details",
            "type": "choice",
            "content": "振込先を選択してください。",
            "choices": [
              {
                "id": "domestic",
                "text": "国内振込",
                "keywords": ["国内", "こくない", "日本", "Japan", "domestic"],
                "excludeKeywords": ["海外", "international"],
                "next": "transfer_amount"
              },
              {
                "id": "international",
                "text": "海外送金",
                "keywords": ["海外", "かいがい", "international", "overseas"],
                "excludeKeywords": ["国内", "domestic"],
                "next": "transfer_amount"
              }
            ]
          },
          "transfer_amount": {
            "id": "transfer_amount",
            "type": "input",
            "content": "振込金額を入力してください。",
            "field": "transferAmount",
            "label": "振込金額",
            "next": "transfer_confirmation"
          },
          "transfer_confirmation": {
            "id": "transfer_confirmation",
            "type": "confirmation",
            "content": "振込内容を確認してください。",
            "field": "transferAmount",
            "label": "振込金額",
            "next": "transaction_complete"
          },
          "transaction_complete": {
            "id": "transaction_complete",
            "type": "message",
            "content": "お取引ありがとうございました。レシートとカードをお取りください。",
            "next": "end_options"
          },
          "end_options": {
            "id": "end_options",
            "type": "choice",
            "content": "他にご利用になりますか？",
            "choices": [
              {
                "id": "continue",
                "text": "続けて利用する",
                "keywords": ["続ける", "もう一度", "また", "continue", "more"],
                "excludeKeywords": ["終了", "finish"],
                "next": "transaction_type"
              },
              {
                "id": "finish",
                "text": "終了する",
                "keywords": ["終了", "終わり", "完了", "finish", "end", "done"],
                "excludeKeywords": ["続ける", "continue"],
                "next": "thank_you"
              }
            ]
          },
          "thank_you": {
            "id": "thank_you",
            "type": "message",
            "content": "ありがとうございました。またのご利用をお待ちしております。"
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
          "start": {
            "id": "start",
            "type": "message",
            "content": "Welcome to our ATM service. Thank you for choosing us.",
            "next": "language_selection"
          },
          "language_selection": {
            "id": "language_selection",
            "type": "choice",
            "content": "Please select your language.\n言語を選択してください。",
            "choices": [
              {
                "id": "japanese",
                "text": "日本語",
                "keywords": ["Japanese", "日本語", "にほんご", "jp"],
                "excludeKeywords": [],
                "next": "transaction_type"
              },
              {
                "id": "english",
                "text": "English",
                "keywords": ["English", "英語", "えいご", "en"],
                "excludeKeywords": [],
                "next": "transaction_type"
              },
              {
                "id": "chinese",
                "text": "中文",
                "keywords": ["Chinese", "中文", "中国語", "zh"],
                "excludeKeywords": [],
                "next": "transaction_type"
              }
            ]
          },
          "transaction_type": {
            "id": "transaction_type",
            "type": "choice",
            "content": "Please select your desired transaction.",
            "choices": [
              {
                "id": "deposit",
                "text": "Deposit",
                "keywords": ["deposit", "put money", "save", "add funds"],
                "excludeKeywords": ["withdraw", "take out"],
                "next": "deposit_amount"
              },
              {
                "id": "payment",
                "text": "Withdrawal",
                "keywords": ["withdrawal", "withdraw", "take out", "get money"],
                "excludeKeywords": ["deposit", "put in"],
                "next": "withdrawal_amount"
              },
              {
                "id": "transfer",
                "text": "Transfer",
                "keywords": ["transfer", "send money", "wire transfer"],
                "excludeKeywords": [],
                "next": "transfer_details"
              }
            ]
          },
          "deposit_amount": {
            "id": "deposit_amount",
            "type": "input",
            "content": "Please enter the deposit amount.",
            "field": "depositAmount",
            "label": "Deposit Amount",
            "next": "deposit_confirmation"
          },
          "deposit_confirmation": {
            "id": "deposit_confirmation",
            "type": "confirmation",
            "content": "Please confirm the deposit amount is correct.",
            "field": "depositAmount",
            "label": "Deposit Amount",
            "next": "transaction_complete"
          },
          "withdrawal_amount": {
            "id": "withdrawal_amount",
            "type": "input",
            "content": "Please enter the withdrawal amount.",
            "field": "payoutAmount",
            "label": "Withdrawal Amount",
            "next": "document_check"
          },
          "document_check": {
            "id": "document_check",
            "type": "choice",
            "content": "Please prepare your identification document.",
            "choices": [
              {
                "id": "driver_license",
                "text": "Driver's License",
                "keywords": ["driver license", "license", "driving license"],
                "excludeKeywords": [],
                "next": "withdrawal_confirmation"
              },
              {
                "id": "passport",
                "text": "Passport",
                "keywords": ["passport", "travel document"],
                "excludeKeywords": [],
                "next": "withdrawal_confirmation"
              },
              {
                "id": "mynumber_card",
                "text": "My Number Card",
                "keywords": ["my number card", "mynumber", "individual number card"],
                "excludeKeywords": [],
                "next": "withdrawal_confirmation"
              },
              {
                "id": "health_insurance",
                "text": "Health Insurance Card",
                "keywords": ["health insurance", "insurance card", "medical card"],
                "excludeKeywords": [],
                "next": "withdrawal_confirmation"
              }
            ]
          },
          "withdrawal_confirmation": {
            "id": "withdrawal_confirmation",
            "type": "confirmation",
            "content": "Please confirm your withdrawal details.",
            "field": "payoutAmount",
            "label": "Withdrawal Amount",
            "next": "transaction_complete"
          },
          "transfer_details": {
            "id": "transfer_details",
            "type": "choice",
            "content": "Please select transfer destination.",
            "choices": [
              {
                "id": "domestic",
                "text": "Domestic Transfer",
                "keywords": ["domestic", "local", "within Japan", "national"],
                "excludeKeywords": ["international", "overseas"],
                "next": "transfer_amount"
              },
              {
                "id": "international",
                "text": "International Transfer",
                "keywords": ["international", "overseas", "abroad", "foreign"],
                "excludeKeywords": ["domestic", "local"],
                "next": "transfer_amount"
              }
            ]
          },
          "transfer_amount": {
            "id": "transfer_amount",
            "type": "input",
            "content": "Please enter the transfer amount.",
            "field": "transferAmount",
            "label": "Transfer Amount",
            "next": "transfer_confirmation"
          },
          "transfer_confirmation": {
            "id": "transfer_confirmation",
            "type": "confirmation",
            "content": "Please confirm your transfer details.",
            "field": "transferAmount",
            "label": "Transfer Amount",
            "next": "transaction_complete"
          },
          "transaction_complete": {
            "id": "transaction_complete",
            "type": "message",
            "content": "Thank you for your transaction. Please take your receipt and card.",
            "next": "end_options"
          },
          "end_options": {
            "id": "end_options",
            "type": "choice",
            "content": "Would you like to make another transaction?",
            "choices": [
              {
                "id": "continue",
                "text": "Continue using",
                "keywords": ["continue", "more", "another", "again"],
                "excludeKeywords": ["finish", "end"],
                "next": "transaction_type"
              },
              {
                "id": "finish",
                "text": "Finish",
                "keywords": ["finish", "end", "done", "complete", "exit"],
                "excludeKeywords": ["continue", "more"],
                "next": "thank_you"
              }
            ]
          },
          "thank_you": {
            "id": "thank_you",
            "type": "message",
            "content": "Thank you for using our service. We look forward to serving you again."
          }
        }
      }
    }
  }
}