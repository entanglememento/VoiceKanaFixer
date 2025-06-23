'use client'

import { useState, useEffect } from 'react'
import { Language } from '@/types'

interface QRCodeDisplayProps {
  language: Language
  isLarge?: boolean
  isHighContrast?: boolean
  userInputs?: Record<string, string>
  currentNode?: string
  onComplete?: () => void
}

export default function QRCodeDisplay({ 
  language,
  isLarge = false,
  isHighContrast = false,
  userInputs = {},
  currentNode = '',
  onComplete
}: QRCodeDisplayProps) {
  // Silence unused variable warning
  void currentNode
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('')
  const [transactionData, setTransactionData] = useState<{
    transactionId?: string
    timestamp?: string
    qrTextContent?: string
    details?: {
      type: string
      amount: string
      currency: string
      recipientAccount?: string
    }
  }>({})

  // Generate transaction data based on user inputs
  useEffect(() => {
    const generateTransactionData = () => {
      const timestamp = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()
      const transactionId = `TXN-${Date.now().toString().slice(-8)}`
      
      // Create plain text content based on transaction type
      let qrTextContent = ''
      let displayDetails = {
        type: '取引完了',
        amount: '0',
        currency: 'JPY' as const,
        recipientAccount: undefined as string | undefined
      }
      
      if (userInputs.depositAmount) {
        qrTextContent = `預入取引
取引ID: ${transactionId}
金額: ${parseInt(userInputs.depositAmount).toLocaleString()}円
取引時刻: ${timestamp}
ATM: ATM-001`
        displayDetails = {
          type: '預入',
          amount: userInputs.depositAmount,
          currency: 'JPY' as const,
          recipientAccount: undefined
        }
      } else if (userInputs.payoutAmount) {
        qrTextContent = `払出取引
取引ID: ${transactionId}
金額: ${parseInt(userInputs.payoutAmount).toLocaleString()}円
取引時刻: ${timestamp}
ATM: ATM-001`
        displayDetails = {
          type: '払出',
          amount: userInputs.payoutAmount,
          currency: 'JPY' as const,
          recipientAccount: undefined
        }
      } else if (userInputs.transferAmount) {
        qrTextContent = `振込取引
取引ID: ${transactionId}
金額: ${parseInt(userInputs.transferAmount).toLocaleString()}円
受取人口座: ${userInputs.recipientAccount || '未入力'}
取引時刻: ${timestamp}
ATM: ATM-001`
        displayDetails = {
          type: '振込',
          amount: userInputs.transferAmount,
          currency: 'JPY' as const,
          recipientAccount: userInputs.recipientAccount || 'N/A'
        }
      } else {
        qrTextContent = `取引完了
取引ID: ${transactionId}
取引時刻: ${timestamp}
ATM: ATM-001`
        displayDetails = {
          type: '取引完了',
          amount: '0',
          currency: 'JPY' as const,
          recipientAccount: undefined
        }
      }

      const data = {
        transactionId,
        timestamp,
        qrTextContent,
        details: displayDetails
      }
      
      setTransactionData(data)
      return data
    }

    const data = generateTransactionData()
    generateQRCode(data.qrTextContent)
  }, [userInputs])

  // Generate actual QR code using qrcode library
  const generateQRCode = async (qrTextContent: string) => {
    try {
      // Use the plain text content directly
      const qrDataString = qrTextContent
      
      // Try to use qrcode library if available
      if (typeof window !== 'undefined') {
        try {
          // Dynamic import for qrcode
          const QRCode = await import('qrcode')
          const dataURL = await QRCode.toDataURL(qrDataString, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            },
            errorCorrectionLevel: 'M'
          })
          setQrCodeDataURL(dataURL)
          return
        } catch {
          console.log('QRCode library not available, using fallback generation')
        }
      }
      
      // Fallback: Use browser's canvas to generate QR-like code
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        const size = 200
        canvas.width = size
        canvas.height = size
        
        // Clear canvas
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, size, size)
        
        // Generate QR pattern based on data
        const moduleSize = 8
        const modules = Math.floor(size / moduleSize)
        
        ctx.fillStyle = 'black'
        
        // Create a hash from the data string for consistent pattern
        let hash = 0
        for (let i = 0; i < qrDataString.length; i++) {
          const char = qrDataString.charCodeAt(i)
          hash = ((hash << 5) - hash + char) & 0xffffffff
        }
        
        // Simple QR-like pattern generation with data-based modules
        for (let i = 0; i < modules; i++) {
          for (let j = 0; j < modules; j++) {
            const x = i * moduleSize
            const y = j * moduleSize
            
            // Create finder patterns (corner squares)
            const isFinderPattern = 
              (i < 7 && j < 7) || 
              (i < 7 && j >= modules - 7) || 
              (i >= modules - 7 && j < 7)
            
            if (isFinderPattern) {
              const isFinderModule = 
                (i === 0 || i === 6 || j === 0 || j === 6) ||
                (i >= 2 && i <= 4 && j >= 2 && j <= 4)
              if (isFinderModule) {
                ctx.fillRect(x, y, moduleSize, moduleSize)
              }
            } else {
              // Data modules based on hash and position
              const dataIndex = (i * modules + j) % qrDataString.length
              const charCode = qrDataString.charCodeAt(dataIndex)
              const positionHash = (i * 31 + j * 17 + hash) & 0xffffffff
              const shouldFill = (charCode + positionHash) % 3 === 0
              
              if (shouldFill) {
                ctx.fillRect(x, y, moduleSize, moduleSize)
              }
            }
          }
        }
        
        // Convert to data URL
        const dataURL = canvas.toDataURL('image/png')
        setQrCodeDataURL(dataURL)
      }
    } catch (error) {
      console.error('QR code generation failed:', error)
    }
  }

  return (
    <div className="flex flex-col items-center p-8 animate-[fadeInScale_0.8s_ease-out]">
      {/* QR Code Container */}
      <div className={`
        relative bg-white p-6 rounded-3xl shadow-2xl border
        ${isHighContrast ? 'border-2 border-black' : 'border border-gray-200'}
        transform transition-all duration-300 hover:scale-105
      `}>
        {/* Scanning animation overlay */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-blue-500 animate-pulse"></div>
        </div>
        
        {/* QR Code Image */}
        <div className="w-56 h-56 rounded-lg overflow-hidden bg-white flex items-center justify-center">
          {qrCodeDataURL ? (
            <img 
              src={qrCodeDataURL} 
              alt="Transaction QR Code"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          )}
        </div>
        
        {/* Corner indicators */}
        <div className="absolute top-4 left-4 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        <div className="absolute top-4 right-4 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        <div className="absolute bottom-4 left-4 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
      </div>

      {/* Instructions */}
      <div className={`
        mt-6 text-center max-w-md
        ${isLarge ? 'text-xl' : 'text-lg'}
        ${isHighContrast ? 'text-black' : 'text-gray-800 dark:text-gray-200'}
      `}>
        <h3 className="font-bold mb-4 text-2xl bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
          {language === 'ja' 
            ? 'お取引QRコード' 
            : 'Transaction QR Code'
          }
        </h3>
        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-2xl border border-blue-200">
          <p className={`
            ${isLarge ? 'text-lg' : 'text-base'}
            ${isHighContrast ? 'text-black' : 'text-gray-700'}
            leading-relaxed
          `}>
            {language === 'ja'
              ? 'スマートフォンのカメラでこのQRコードをスキャンして、お取引を完了してください。'
              : 'Please scan this QR code with your smartphone camera to complete your transaction.'
            }
          </p>
        </div>
      </div>

      {/* Transaction Details */}
      <div className="mt-6 space-y-3 w-full max-w-md">
        {/* Transaction ID */}
        <div className={`
          px-6 py-3 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200
          ${isHighContrast ? 'border-black bg-gray-200' : ''}
        `}>
          <p className={`
            ${isLarge ? 'text-sm' : 'text-xs'}
            ${isHighContrast ? 'text-black' : 'text-gray-600'}
            font-medium
          `}>
            {language === 'ja' ? '取引ID' : 'Transaction ID'}
          </p>
          <p className={`
            ${isLarge ? 'text-base' : 'text-sm'}
            ${isHighContrast ? 'text-black' : 'text-gray-800'}
            font-mono font-bold
          `}>
            {transactionData.transactionId || 'TXN-XXXXXXXX'}
          </p>
        </div>

        {/* Transaction Type and Amount */}
        {transactionData.details && (
          <div className={`
            px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200
            ${isHighContrast ? 'border-black bg-gray-200' : ''}
          `}>
            <div className="flex justify-between items-center">
              <div>
                <p className={`
                  ${isLarge ? 'text-sm' : 'text-xs'}
                  ${isHighContrast ? 'text-black' : 'text-blue-600'}
                  font-medium
                `}>
                  {language === 'ja' ? '取引種別' : 'Transaction Type'}
                </p>
                <p className={`
                  ${isLarge ? 'text-base' : 'text-sm'}
                  ${isHighContrast ? 'text-black' : 'text-blue-800'}
                  font-bold
                `}>
                  {transactionData.details.type}
                </p>
              </div>
              <div className="text-right">
                <p className={`
                  ${isLarge ? 'text-sm' : 'text-xs'}
                  ${isHighContrast ? 'text-black' : 'text-blue-600'}
                  font-medium
                `}>
                  {language === 'ja' ? '金額' : 'Amount'}
                </p>
                <p className={`
                  ${isLarge ? 'text-lg' : 'text-base'}
                  ${isHighContrast ? 'text-black' : 'text-blue-800'}
                  font-bold
                `}>
                  ¥{parseInt(transactionData.details?.amount || '0').toLocaleString()}
                </p>
              </div>
            </div>
            
            {/* Additional details for transfer */}
            {transactionData.details.recipientAccount && (
              <div className="mt-2 pt-2 border-t border-blue-300">
                <p className={`
                  ${isLarge ? 'text-sm' : 'text-xs'}
                  ${isHighContrast ? 'text-black' : 'text-blue-600'}
                  font-medium
                `}>
                  {language === 'ja' ? '受取人口座' : 'Recipient Account'}
                </p>
                <p className={`
                  ${isLarge ? 'text-base' : 'text-sm'}
                  ${isHighContrast ? 'text-black' : 'text-blue-800'}
                  font-mono font-bold
                `}>
                  {transactionData.details.recipientAccount}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className={`
          px-6 py-3 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200
          ${isHighContrast ? 'border-black bg-gray-200' : ''}
        `}>
          <p className={`
            ${isLarge ? 'text-sm' : 'text-xs'}
            ${isHighContrast ? 'text-black' : 'text-gray-600'}
            font-medium
          `}>
            {language === 'ja' ? '取引時刻' : 'Transaction Time'}
          </p>
          <p className={`
            ${isLarge ? 'text-base' : 'text-sm'}
            ${isHighContrast ? 'text-black' : 'text-gray-800'}
            font-mono
          `}>
            {transactionData.timestamp 
              ? new Date(transactionData.timestamp).toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US')
              : new Date().toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US')
            }
          </p>
        </div>
        
        <div className="flex items-center justify-center gap-2 text-green-600">
          <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">
            {language === 'ja' ? 'スキャン待機中' : 'Ready to scan'}
          </span>
        </div>
      </div>

      {/* Completion Notice */}
      <div className="mt-8 text-center">
        <div className={`
          p-4 rounded-2xl border border-green-200 bg-gradient-to-r from-green-50 to-blue-50
          ${isHighContrast ? 'border-black bg-gray-100' : ''}
        `}>
          <h4 className={`
            font-bold mb-2 text-green-700
            ${isLarge ? 'text-lg' : 'text-base'}
            ${isHighContrast ? 'text-black' : ''}
          `}>
            {language === 'ja' ? 'お取引完了' : 'Transaction Complete'}
          </h4>
          <p className={`
            ${isLarge ? 'text-base' : 'text-sm'}
            ${isHighContrast ? 'text-black' : 'text-gray-600'}
          `}>
            {language === 'ja' 
              ? 'ありがとうございました。またのご利用をお待ちしております。' 
              : 'Thank you for using our service. We look forward to serving you again.'
            }
          </p>
        </div>

        {/* New transaction button */}
        {onComplete && (
          <button
            onClick={onComplete}
            className={`
              mt-4 px-8 py-3 rounded-2xl font-medium transition-all duration-300
              ${isHighContrast
                ? 'bg-black text-white hover:bg-gray-800'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
              }
              hover:scale-105 active:scale-95
              focus:outline-none focus:ring-4 focus:ring-blue-300
              shadow-lg hover:shadow-xl
            `}
          >
            {language === 'ja' ? '新しい取引を開始' : 'Start New Transaction'}
          </button>
        )}
      </div>
    </div>
  )
}