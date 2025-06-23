'use client'

import { Choice } from '@/types'

interface ChoiceButtonsProps {
  choices: Choice[]
  onChoiceSelect: (choice: Choice) => void
  isLarge?: boolean
  isHighContrast?: boolean
}

export default function ChoiceButtons({ 
  choices, 
  onChoiceSelect, 
  isLarge = false,
  isHighContrast = false 
}: ChoiceButtonsProps) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 mt-4 sm:mt-6">
      {choices.map((choice, index) => (
        <button
          key={choice.id}
          onClick={() => onChoiceSelect(choice)}
          style={{ animationDelay: `${index * 100}ms` }}
          className={`
            relative px-4 sm:px-8 py-4 sm:py-5 rounded-2xl transition-all duration-300 transform touch-button
            animate-[slideInUp_0.6s_ease-out_forwards] opacity-0
            ${isHighContrast
              ? 'bg-white text-black border-3 border-black hover:bg-black hover:text-white'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
            }
            ${isLarge ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'}
            font-semibold
            focus:outline-none focus:ring-4 focus:ring-blue-300
            disabled:opacity-50 disabled:cursor-not-allowed
            hover:scale-105 active:scale-95
            group overflow-hidden
          `}
        >
          {/* Ripple effect */}
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-2xl"></div>
          
          {/* Choice content with number */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4 relative z-10 min-w-0">
              {/* Number circle */}
              <div className={`
                rounded-full flex items-center justify-center flex-shrink-0
                ${isLarge ? 'w-8 h-8 sm:w-10 sm:h-10 text-base sm:text-lg' : 'w-7 h-7 sm:w-8 sm:h-8 text-sm sm:text-base'}
                ${isHighContrast
                  ? 'bg-black text-white group-hover:bg-white group-hover:text-black border-2 border-black'
                  : 'bg-white/20 text-white group-hover:bg-white group-hover:text-blue-600'
                }
                font-bold transition-all duration-300
              `}>
                {index + 1}
              </div>
              {/* Choice text */}
              <span className="text-left flex-1 min-w-0">{choice.text}</span>
            </div>
            <svg 
              className="w-5 h-5 sm:w-6 sm:h-6 ml-2 sm:ml-3 opacity-70 group-hover:opacity-100 transition-opacity duration-300 relative z-10 flex-shrink-0" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      ))}
    </div>
  )
}