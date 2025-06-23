'use client'

import { Language } from '@/types'

interface ConfirmationButtonsProps {
  onConfirm: (isConfirmed: boolean) => void
  language: Language
  isLarge?: boolean
  isHighContrast?: boolean
  suggestion?: string
  onUserInteraction?: () => void
}

export default function ConfirmationButtons({ 
  onConfirm, 
  language,
  isLarge = false,
  isHighContrast = false,
  suggestion,
  onUserInteraction
}: ConfirmationButtonsProps) {
  
  const handleConfirm = (isConfirmed: boolean) => {
    onUserInteraction?.()
    onConfirm(isConfirmed)
  }
  return (
    <div className="flex flex-col gap-3 mt-4">
      {suggestion && (
        <div className={`
          p-3 rounded-lg mb-2
          ${isHighContrast 
            ? 'bg-gray-100 border-2 border-gray-400 text-black' 
            : 'bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
          }
          ${isLarge ? 'text-base' : 'text-sm'}
        `}>
          <p className="font-medium">
            {language === 'ja' ? '推測された内容:' : 'Suggested interpretation:'}
          </p>
          <p className="mt-1">「{suggestion}」</p>
        </div>
      )}
      
      <div className="flex gap-3">
        <button
          onClick={() => handleConfirm(true)}
          className={`
            flex-1 px-6 py-4 rounded-xl font-medium transition-all duration-200
            ${isHighContrast
              ? 'bg-black text-white hover:bg-gray-800 border-2 border-black'
              : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
            }
            ${isLarge ? 'text-lg' : 'text-base'}
            focus:outline-none focus:ring-4 focus:ring-green-300
            transform active:scale-98
          `}
        >
          {language === 'ja' ? 'はい' : 'Yes'}
        </button>
        
        <button
          onClick={() => handleConfirm(false)}
          className={`
            flex-1 px-6 py-4 rounded-xl font-medium transition-all duration-200
            ${isHighContrast
              ? 'bg-white text-black hover:bg-gray-100 border-2 border-gray-400'
              : 'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg'
            }
            ${isLarge ? 'text-lg' : 'text-base'}
            focus:outline-none focus:ring-4 focus:ring-red-300
            transform active:scale-98
          `}
        >
          {language === 'ja' ? 'いいえ' : 'No'}
        </button>
      </div>
    </div>
  )
}