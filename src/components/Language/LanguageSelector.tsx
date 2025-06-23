'use client'

import { Language } from '@/types'

interface LanguageSelectorProps {
  selectedLanguage: Language
  onLanguageChange: (language: Language) => void
  isLarge?: boolean
  isHighContrast?: boolean
}

const languages = [
  { code: 'ja' as Language, name: '日本語', flag: '🇯🇵' },
  { code: 'en' as Language, name: 'English', flag: '🇺🇸' }
]

export default function LanguageSelector({ 
  selectedLanguage, 
  onLanguageChange,
  isLarge = false,
  isHighContrast = false 
}: LanguageSelectorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 p-8">
      <div className={`
        bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full
        ${isHighContrast ? 'border-4 border-black bg-white' : ''}
      `}>
        <h1 className={`
          text-center font-bold mb-8
          ${isLarge ? 'text-3xl' : 'text-2xl'}
          ${isHighContrast ? 'text-black' : 'text-gray-800 dark:text-white'}
        `}>
          言語を選択してください<br />
          <span className={`${isLarge ? 'text-2xl' : 'text-xl'} font-normal`}>
            Please select a language
          </span>
        </h1>
        
        <div className="space-y-4">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => onLanguageChange(language.code)}
              className={`
                w-full p-6 rounded-xl transition-all duration-200 flex items-center justify-between
                ${selectedLanguage === language.code
                  ? isHighContrast
                    ? 'bg-black text-white border-2 border-black'
                    : 'bg-blue-500 text-white shadow-lg scale-105'
                  : isHighContrast
                    ? 'bg-white text-black border-2 border-gray-400 hover:border-black'
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white'
                }
                ${isLarge ? 'text-xl' : 'text-lg'}
                font-medium
                focus:outline-none focus:ring-4 focus:ring-blue-300
                transform hover:scale-102
              `}
            >
              <div className="flex items-center">
                <span className="text-2xl mr-4">{language.flag}</span>
                <span>{language.name}</span>
              </div>
              
              {selectedLanguage === language.code && (
                <svg 
                  className="w-6 h-6" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
              )}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => onLanguageChange(selectedLanguage)}
          className={`
            w-full mt-8 py-4 rounded-xl font-bold
            ${isHighContrast
              ? 'bg-black text-white hover:bg-gray-800'
              : 'bg-green-500 hover:bg-green-600 text-white'
            }
            ${isLarge ? 'text-xl' : 'text-lg'}
            shadow-lg
            focus:outline-none focus:ring-4 focus:ring-green-300
            transition-all duration-200
            transform hover:scale-102
          `}
        >
          {selectedLanguage === 'ja' ? '開始' : 'Start'}
        </button>
      </div>
      
      {/* Footer */}
      <div className={`
        mt-8 text-center
        ${isLarge ? 'text-base' : 'text-sm'}
        ${isHighContrast ? 'text-black' : 'text-gray-500 dark:text-gray-400'}
      `}>
        <p>
          {selectedLanguage === 'ja' 
            ? 'タッチまたはクリックして言語を選択してください' 
            : 'Touch or click to select your language'
          }
        </p>
      </div>
    </div>
  )
}