'use client'

import { Language } from '@/types'

interface ProgressStep {
  id: string
  label: string
  completed: boolean
  current: boolean
}

interface ProgressNavigationProps {
  currentNodeId: string
  language: Language
  isLarge?: boolean
  isHighContrast?: boolean
  flowData?: any
  userInputs?: Record<string, string>
}

export default function ProgressNavigation({
  currentNodeId,
  language,
  isLarge = false,
  isHighContrast = false,
  flowData,
  userInputs = {}
}: ProgressNavigationProps) {
  // 動的なステップ定義（フローデータから生成）
  const getSteps = (): ProgressStep[] => {
    if (!flowData?.languages?.[language]?.nodes) {
      // フォールバック：デフォルトのステップ
      const baseSteps = [
        { id: 'start', label: language === 'ja' ? '開始' : 'Start' },
        { id: 'welcome', label: language === 'ja' ? '受付' : 'Welcome' },
        { id: 'transaction_type', label: language === 'ja' ? '取引選択' : 'Transaction' },
        { id: 'qr_code_display', label: language === 'ja' ? '完了' : 'Complete' }
      ]
      
      return baseSteps.map((step, index) => {
        const currentStepIndex = baseSteps.findIndex(s => s.id === currentNodeId)
        return {
          ...step,
          completed: index < currentStepIndex,
          current: step.id === currentNodeId
        }
      })
    }

    // フローデータに基づく動的ステップ生成
    const nodes = flowData.languages[language].nodes
    const mainPath = buildMainProgressPath(nodes, userInputs)
    
    return mainPath.map((step, index) => {
      const currentStepIndex = mainPath.findIndex(s => s.id === currentNodeId)
      return {
        ...step,
        completed: index < currentStepIndex,
        current: step.id === currentNodeId
      }
    })
  }

  // メインの進行パスを構築
  const buildMainProgressPath = (nodes: any, userInputs: Record<string, string>): Array<{id: string, label: string}> => {
    const progressNodes = [
      { id: 'start', label: language === 'ja' ? '開始' : 'Start' },
      { id: 'welcome', label: language === 'ja' ? '受付' : 'Welcome' },
      { id: 'transaction_type', label: language === 'ja' ? '取引選択' : 'Transaction' }
    ]

    // ユーザーの選択に基づいて次のステップを決定
    const transactionType = userInputs.transaction_type
    
    if (transactionType === 'deposit') {
      progressNodes.push(
        { id: 'deposit_amount', label: language === 'ja' ? '預入金額' : 'Deposit Amount' },
        { id: 'deposit_confirmation', label: language === 'ja' ? '確認' : 'Confirm' }
      )
    } else if (transactionType === 'payout') {
      progressNodes.push(
        { id: 'payout_amount', label: language === 'ja' ? '払出金額' : 'Withdrawal Amount' },
        { id: 'payout_confirmation', label: language === 'ja' ? '確認' : 'Confirm' }
      )
    } else if (transactionType === 'transfer') {
      progressNodes.push(
        { id: 'transfer_country', label: language === 'ja' ? '振込先国' : 'Destination' },
        { id: 'financial_institution', label: language === 'ja' ? '金融機関' : 'Bank' },
        { id: 'account_number', label: language === 'ja' ? '口座番号' : 'Account' },
        { id: 'transfer_amount', label: language === 'ja' ? '振込金額' : 'Amount' },
        { id: 'transfer_confirmation', label: language === 'ja' ? '確認' : 'Confirm' }
      )
    }

    progressNodes.push(
      { id: 'transaction_complete', label: language === 'ja' ? '処理中' : 'Processing' },
      { id: 'qr_code_display', label: language === 'ja' ? '完了' : 'Complete' }
    )

    return progressNodes
  }

  const steps = getSteps()
  const currentStepIndex = steps.findIndex(step => step.current)
  const progressPercentage = Math.max(0, (currentStepIndex / (steps.length - 1)) * 100)

  return (
    <div className={`
      w-full px-4 py-3 border-b backdrop-blur-sm
      ${isHighContrast 
        ? 'bg-white border-black' 
        : 'bg-white/90 dark:bg-gray-800/90 border-gray-200/30 dark:border-gray-700/30'
      }
    `}>
      <div className="max-w-4xl mx-auto">
        {/* プログレスバー */}
        <div className="mb-3">
          <div className={`
            w-full h-2 rounded-full overflow-hidden
            ${isHighContrast ? 'bg-gray-200' : 'bg-gray-100 dark:bg-gray-700'}
          `}>
            <div 
              className={`
                h-full transition-all duration-500 ease-out
                ${isHighContrast 
                  ? 'bg-black' 
                  : 'bg-gradient-to-r from-blue-500 to-blue-600'
                }
              `}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* ステップ表示 */}
        <div className="flex justify-between items-center">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center">
              {/* ステップアイコン */}
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300
                ${isLarge ? 'w-8 h-8' : 'w-6 h-6'}
                ${step.completed 
                  ? isHighContrast 
                    ? 'bg-black text-white' 
                    : 'bg-green-500 text-white'
                  : step.current 
                    ? isHighContrast 
                      ? 'bg-gray-800 text-white ring-2 ring-black' 
                      : 'bg-blue-500 text-white ring-2 ring-blue-300'
                    : isHighContrast 
                      ? 'bg-gray-200 text-gray-600' 
                      : 'bg-gray-200 text-gray-400 dark:bg-gray-600 dark:text-gray-300'
                }
              `}>
                {step.completed ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className={`text-xs font-medium ${isLarge ? 'text-sm' : 'text-xs'}`}>
                    {index + 1}
                  </span>
                )}
              </div>

              {/* ステップラベル */}
              <span className={`
                mt-1 text-center leading-tight
                ${isLarge ? 'text-sm' : 'text-xs'}
                ${step.current 
                  ? isHighContrast 
                    ? 'text-black font-semibold' 
                    : 'text-blue-600 font-semibold dark:text-blue-400'
                  : isHighContrast 
                    ? 'text-gray-600' 
                    : 'text-gray-500 dark:text-gray-400'
                }
              `}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* 現在のステップ詳細 */}
        {currentStepIndex >= 0 && (
          <div className={`
            mt-2 text-center
            ${isLarge ? 'text-base' : 'text-sm'}
            ${isHighContrast ? 'text-gray-800' : 'text-gray-600 dark:text-gray-300'}
          `}>
            {language === 'ja' 
              ? `ステップ ${currentStepIndex + 1} / ${steps.length}` 
              : `Step ${currentStepIndex + 1} of ${steps.length}`
            }
          </div>
        )}
      </div>
    </div>
  )
}