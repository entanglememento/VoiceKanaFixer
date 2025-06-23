import { OptimizedChatFlow, OriginalConfiguration } from '@/types'
import { OpenAIJsonConverter } from '@/services/openaiJsonConverter'

let cachedFlow: OptimizedChatFlow | null = null

export async function getRealBankingFlowFromConfiguration(): Promise<OptimizedChatFlow> {
  // キャッシュがある場合はそれを返す
  if (cachedFlow) {
    return cachedFlow
  }

  try {
    // configuration.jsonを読み込み
    const response = await fetch('/configuration.json')
    const originalConfig: OriginalConfiguration = await response.json()
    
    // OpenAI APIを使用して変換
    const converter = new OpenAIJsonConverter()
    const conversionResult = await converter.convertConfigurationToOptimizedFlow(originalConfig)
    
    if (conversionResult.success && conversionResult.data) {
      cachedFlow = conversionResult.data
      console.log('Configuration converted successfully using OpenAI API')
      if (conversionResult.tokensUsed) {
        console.log(`Tokens used: ${conversionResult.tokensUsed}, Cost: $${conversionResult.cost?.toFixed(4)}`)
      }
      return cachedFlow
    } else {
      console.error('OpenAI conversion failed:', conversionResult.error)
      // フォールバック: 手動で定義されたフローを使用
      return getFallbackBankingFlow()
    }
  } catch (error) {
    console.error('Error loading or converting configuration:', error)
    // フォールバック: 手動で定義されたフローを使用
    return getFallbackBankingFlow()
  }
}

export function getRealBankingFlowFromConfigurationSync(): OptimizedChatFlow {
  // 同期版 - キャッシュがない場合はフォールバックを返す
  return cachedFlow || getFallbackBankingFlow()
}

// キャッシュを更新する関数
export function updateCachedFlow(updatedFlow: OptimizedChatFlow): void {
  cachedFlow = updatedFlow
  console.log('Flow cache updated with new data')
}

// キャッシュをクリアする関数
export function clearFlowCache(): void {
  cachedFlow = null
  console.log('Flow cache cleared')
}

// 初期化時にキャッシュをクリア（開発時のみ）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  clearFlowCache()
}

function getFallbackBankingFlow(): OptimizedChatFlow {
  const fallbackFlow: OptimizedChatFlow = {
    version: "1.0",
    storeName: "AIアシスタント - 銀行ATM",
    languages: {
      ja: {
        languageSelection: true,
        settings: {
          autoStopSeconds: 3,
          voiceSpeed: 1.0,
          qrPassword: "1234",
          qrExpiryMinutes: 30
        },
        nodes: {
          start: {
            id: "start",
            type: "message",
            content: "下記から取引メニューをお選びください。",
            next: "transaction_type",
            voiceFile: "welcome_3"
          },
          transaction_type: {
            id: "transaction_type",
            type: "choice",
            content: "ご希望の取引を選択してください。",
            voiceFile: "transaction_type_3",
            choices: [
              {
                id: "deposit",
                text: "預入",
                keywords: ["預入", "入金", "預金", "お預け入れ", "よにゅう"],
                excludeKeywords: ["出金", "引き出し", "振込"],
                next: "deposit_amount"
              },
              {
                id: "payout",
                text: "払出",
                keywords: ["払出", "出金", "引き出し", "払い出し", "ひきだし"],
                excludeKeywords: ["入金", "預入", "振込"],
                next: "payout_amount"
              },
              {
                id: "transfer",
                text: "振込",
                keywords: ["振込", "送金", "振り込み", "ふりこみ"],
                excludeKeywords: [],
                next: "transfer_country"
              }
            ]
          },
          // 預入フロー
          deposit_amount: {
            id: "deposit_amount",
            type: "input",
            content: "預入金額を入力してください。",
            field: "depositAmount",
            label: "預入金額（円）",
            next: "deposit_confirmation"
          },
          deposit_confirmation: {
            id: "deposit_confirmation",
            type: "confirmation",
            content: "預入金額が正しいことを確認してください。",
            field: "depositAmount",
            label: "預入金額",
            next: "qr_code_display"
          },
          // 払出フロー
          payout_amount: {
            id: "payout_amount",
            type: "input",
            content: "払出金額を入力してください。",
            field: "payoutAmount",
            label: "払出金額（円）",
            next: "payout_confirmation"
          },
          payout_confirmation: {
            id: "payout_confirmation",
            type: "confirmation",
            content: "払出金額が正しいことを確認してください。",
            field: "payoutAmount",
            label: "払出金額",
            next: "qr_code_display"
          },
          // 振込フロー
          transfer_country: {
            id: "transfer_country",
            type: "choice",
            content: "振込先の国を選択してください。",
            choices: [
              {
                id: "domestic",
                text: "国内振込",
                keywords: ["国内", "日本", "こくない"],
                excludeKeywords: ["海外", "国際"],
                next: "transfer_account"
              },
              {
                id: "international",
                text: "海外送金",
                keywords: ["海外", "国際", "かいがい"],
                excludeKeywords: ["国内", "日本"],
                next: "transfer_country_select"
              }
            ]
          },
          transfer_country_select: {
            id: "transfer_country_select",
            type: "choice",
            content: "送金先の国を選択してください。",
            choices: [
              {
                id: "usa",
                text: "アメリカ",
                keywords: ["アメリカ", "米国", "USA"],
                excludeKeywords: [],
                next: "transfer_account"
              },
              {
                id: "korea",
                text: "韓国",
                keywords: ["韓国", "korea"],
                excludeKeywords: [],
                next: "transfer_account"
              },
              {
                id: "china",
                text: "中国",
                keywords: ["中国", "china"],
                excludeKeywords: [],
                next: "transfer_account"
              }
            ]
          },
          transfer_account: {
            id: "transfer_account",
            type: "input",
            content: "受取人の口座番号を入力してください。",
            field: "recipientAccount",
            label: "受取人口座番号",
            next: "transfer_amount"
          },
          transfer_amount: {
            id: "transfer_amount",
            type: "input",
            content: "送金金額を入力してください。",
            field: "transferAmount",
            label: "送金金額（円）",
            next: "transfer_confirmation"
          },
          transfer_confirmation: {
            id: "transfer_confirmation",
            type: "confirmation",
            content: "振込内容が正しいことを確認してください。",
            field: "transferAmount",
            label: "送金金額",
            next: "qr_code_display"
          },
          // QRコード表示
          qr_code_display: {
            id: "qr_code_display",
            type: "qr_display",
            content: "お取引が完了しました。下記のQRコードで取引内容をご確認ください。",
            next: undefined
          }
        }
      },
      en: {
        languageSelection: true,
        settings: {
          autoStopSeconds: 3,
          voiceSpeed: 1.0,
          qrPassword: "1234",
          qrExpiryMinutes: 30
        },
        nodes: {
          start: {
            id: "start",
            type: "message",
            content: "Please select your transaction from below.",
            next: "transaction_type"
          },
          transaction_type: {
            id: "transaction_type",
            type: "choice",
            content: "Please select your desired transaction.",
            choices: [
              {
                id: "deposit",
                text: "Deposit",
                keywords: ["deposit", "put in"],
                excludeKeywords: ["withdraw", "transfer"],
                next: "deposit_amount"
              },
              {
                id: "payout",
                text: "Withdrawal",
                keywords: ["withdraw", "take out"],
                excludeKeywords: ["deposit", "transfer"],
                next: "payout_amount"
              },
              {
                id: "transfer",
                text: "Transfer",
                keywords: ["transfer", "send"],
                excludeKeywords: [],
                next: "transfer_country"
              }
            ]
          },
          // Deposit Flow
          deposit_amount: {
            id: "deposit_amount",
            type: "input",
            content: "Please enter the deposit amount.",
            field: "depositAmount",
            label: "Deposit Amount (¥)",
            next: "deposit_confirmation"
          },
          deposit_confirmation: {
            id: "deposit_confirmation",
            type: "confirmation",
            content: "Please confirm the deposit amount.",
            field: "depositAmount",
            label: "Deposit Amount",
            next: "qr_code_display"
          },
          // Withdrawal Flow
          payout_amount: {
            id: "payout_amount",
            type: "input",
            content: "Please enter the withdrawal amount.",
            field: "payoutAmount",
            label: "Withdrawal Amount (¥)",
            next: "payout_confirmation"
          },
          payout_confirmation: {
            id: "payout_confirmation",
            type: "confirmation",
            content: "Please confirm the withdrawal amount.",
            field: "payoutAmount",
            label: "Withdrawal Amount",
            next: "qr_code_display"
          },
          // Transfer Flow
          transfer_country: {
            id: "transfer_country",
            type: "choice",
            content: "Please select the transfer destination.",
            choices: [
              {
                id: "domestic",
                text: "Domestic Transfer",
                keywords: ["domestic", "japan", "local"],
                excludeKeywords: ["international", "overseas"],
                next: "transfer_account"
              },
              {
                id: "international",
                text: "International Transfer",
                keywords: ["international", "overseas", "foreign"],
                excludeKeywords: ["domestic", "local"],
                next: "transfer_country_select"
              }
            ]
          },
          transfer_country_select: {
            id: "transfer_country_select",
            type: "choice",
            content: "Please select the destination country.",
            choices: [
              {
                id: "usa",
                text: "United States",
                keywords: ["usa", "america", "united states"],
                excludeKeywords: [],
                next: "transfer_account"
              },
              {
                id: "korea",
                text: "South Korea",
                keywords: ["korea", "south korea"],
                excludeKeywords: [],
                next: "transfer_account"
              },
              {
                id: "china",
                text: "China",
                keywords: ["china", "chinese"],
                excludeKeywords: [],
                next: "transfer_account"
              }
            ]
          },
          transfer_account: {
            id: "transfer_account",
            type: "input",
            content: "Please enter the recipient's account number.",
            field: "recipientAccount",
            label: "Recipient Account Number",
            next: "transfer_amount"
          },
          transfer_amount: {
            id: "transfer_amount",
            type: "input",
            content: "Please enter the transfer amount.",
            field: "transferAmount",
            label: "Transfer Amount (¥)",
            next: "transfer_confirmation"
          },
          transfer_confirmation: {
            id: "transfer_confirmation",
            type: "confirmation",
            content: "Please confirm the transfer details.",
            field: "transferAmount",
            label: "Transfer Amount",
            next: "qr_code_display"
          },
          // QR Code Display
          qr_code_display: {
            id: "qr_code_display",
            type: "qr_display",
            content: "Transaction completed. Please scan the QR code below to confirm your transaction details.",
            next: undefined
          }
        }
      }
    }
  }
  
  return fallbackFlow
}