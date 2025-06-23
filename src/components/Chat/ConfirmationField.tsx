'use client'

import { Language } from '@/types'

interface ConfirmationFieldProps {
  content: string
  field?: string
  label?: string
  userInputs: Record<string, string>
  onConfirm: (isConfirmed: boolean) => void
  language: Language
  isLarge?: boolean
  isHighContrast?: boolean
}

export default function ConfirmationField({ 
  content,
  field,
  label,
  userInputs,
  onConfirm,
  language,
  isLarge = false,
  isHighContrast = false 
}: ConfirmationFieldProps) {
  const getValue = () => {
    if (field && userInputs[field]) {
      return userInputs[field]
    }
    return ''
  }

  const value = getValue()
  const formatValue = (val: string) => {
    // Format amount fields with comma separators
    if (field?.includes('Amount') && val) {
      const numValue = parseInt(val.replace(/[^0-9]/g, ''))
      return `¥${numValue.toLocaleString()}`
    }
    return val
  }

  return (
    <div className="space-y-4">
      {/* Content Message */}
      <div className={`
        p-4 rounded-lg
        ${isHighContrast
          ? 'bg-gray-100 border-2 border-black'
          : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
        }
      `}>
        <p className={`
          ${isLarge ? 'text-lg' : 'text-base'}
          ${isHighContrast ? 'text-black' : 'text-blue-800 dark:text-blue-200'}
          font-medium
        `}>
          {content}
        </p>
      </div>

      {/* Value Display */}
      {value && (
        <div className={`
          p-4 rounded-lg
          ${isHighContrast
            ? 'bg-white border-2 border-black'
            : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
          }
        `}>
          <div className="flex justify-between items-center">
            <span className={`
              ${isLarge ? 'text-base' : 'text-sm'}
              ${isHighContrast ? 'text-black' : 'text-gray-600 dark:text-gray-400'}
              font-medium
            `}>
              {label || field}:
            </span>
            <span className={`
              ${isLarge ? 'text-xl' : 'text-lg'}
              ${isHighContrast ? 'text-black' : 'text-gray-900 dark:text-white'}
              font-bold
            `}>
              {formatValue(value)}
            </span>
          </div>
        </div>
      )}

      {/* Confirmation Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onConfirm(true)}
          className={`
            flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200
            ${isHighContrast
              ? 'bg-black text-white hover:bg-gray-800'
              : 'bg-green-500 hover:bg-green-600 text-white'
            }
            ${isLarge ? 'text-lg' : 'text-base'}
            focus:outline-none focus:ring-4 focus:ring-green-300
            shadow-lg hover:shadow-xl
          `}
        >
          {language === 'ja' ? 'はい、確定' : 'Yes, Confirm'}
        </button>
        
        <button
          onClick={() => onConfirm(false)}
          className={`
            flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200
            ${isHighContrast
              ? 'bg-gray-600 text-white hover:bg-gray-700'
              : 'bg-gray-500 hover:bg-gray-600 text-white'
            }
            ${isLarge ? 'text-lg' : 'text-base'}
            focus:outline-none focus:ring-4 focus:ring-gray-300
            shadow-lg hover:shadow-xl
          `}
        >
          {language === 'ja' ? 'いいえ、戻る' : 'No, Go Back'}
        </button>
      </div>
    </div>
  )
}