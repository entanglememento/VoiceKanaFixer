'use client'

interface SettingsButtonProps {
  onTextSizeToggle: () => void
  onContrastToggle: () => void
  isLarge: boolean
  isHighContrast: boolean
  language: 'ja' | 'en'
}

export default function SettingsButton({ 
  onTextSizeToggle, 
  onContrastToggle, 
  isLarge,
  isHighContrast,
  language 
}: SettingsButtonProps) {
  return (
    <div className="fixed top-2 left-2 sm:left-4 flex gap-1 sm:gap-2 z-50">
      {/* Text Size Toggle */}
      <button
        onClick={onTextSizeToggle}
        className={`
          p-2 sm:p-2 rounded-full shadow-lg touch-button
          ${isHighContrast
            ? 'bg-white text-black border-2 border-black hover:bg-gray-100'
            : 'bg-white hover:bg-gray-50 text-gray-800 shadow-md'
          }
          focus:outline-none focus:ring-4 focus:ring-blue-300
          transition-all duration-200
          ${isLarge ? 'p-2 sm:p-3' : 'p-2'}
        `}
        title={language === 'ja' 
          ? (isLarge ? '文字を小さく' : '文字を大きく')
          : (isLarge ? 'Smaller text' : 'Larger text')
        }
      >
        <svg 
          className={`${isLarge ? 'w-4 h-4 sm:w-5 sm:h-5' : 'w-3 h-3 sm:w-4 sm:h-4'}`} 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M9 4v3h5v12h3V7h5V4H9zm-6 8h3v7h3v-7h3V9H3v3z"/>
        </svg>
      </button>
      
      {/* High Contrast Toggle */}
      <button
        onClick={onContrastToggle}
        className={`
          p-2 sm:p-2 rounded-full shadow-lg touch-button
          ${isHighContrast
            ? 'bg-black text-white border-2 border-white hover:bg-gray-800'
            : 'bg-white hover:bg-gray-50 text-gray-800 shadow-md'
          }
          focus:outline-none focus:ring-4 focus:ring-blue-300
          transition-all duration-200
          ${isLarge ? 'p-2 sm:p-3' : 'p-2'}
        `}
        title={language === 'ja' 
          ? (isHighContrast ? '通常表示' : '高コントラスト')
          : (isHighContrast ? 'Normal display' : 'High contrast')
        }
      >
        <svg 
          className={`${isLarge ? 'w-4 h-4 sm:w-5 sm:h-5' : 'w-3 h-3 sm:w-4 sm:h-4'}`} 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
      </button>
    </div>
  )
}