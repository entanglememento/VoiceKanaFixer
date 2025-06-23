'use client'

import { Language } from '@/types'

interface StartScreenProps {
  language: Language
  onStart: () => void
  isLarge?: boolean
  isHighContrast?: boolean
}

export default function StartScreen({
  language,
  onStart,
  isLarge = false,
  isHighContrast = false
}: StartScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {/* メインロゴ・アイコン */}
      <div className="mb-8 animate-[fadeInScale_1s_ease-out]">
        <div className={`
          w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center shadow-2xl
          ${isLarge ? 'w-32 h-32' : 'w-24 h-24'}
          ${isHighContrast 
            ? 'bg-black text-white' 
            : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
          }
          animate-float
        `}>
          <svg className={`${isLarge ? 'w-16 h-16' : 'w-12 h-12'}`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
      </div>

      {/* ウェルカムメッセージ */}
      <div className="text-center mb-8 animate-[slideInUp_0.8s_ease-out_0.2s_both]">
        <h1 className={`
          font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent
          ${isLarge ? 'text-4xl' : 'text-3xl'}
        `}>
          {language === 'ja' ? 'ATMサービス' : 'ATM Service'}
        </h1>
        <p className={`
          leading-relaxed max-w-md
          ${isLarge ? 'text-xl' : 'text-lg'}
          ${isHighContrast ? 'text-black' : 'text-gray-600 dark:text-gray-300'}
        `}>
          {language === 'ja' 
            ? 'AIアシスタントがお手伝いします。画面をタッチして開始してください。' 
            : 'AI assistant will help you. Touch the screen to start.'
          }
        </p>
      </div>

      {/* タッチボタン */}
      <div className="animate-[slideInUp_0.8s_ease-out_0.4s_both]">
        <button
          onClick={onStart}
          className={`
            relative px-12 py-6 rounded-2xl font-bold text-xl transition-all duration-300 transform
            ${isLarge ? 'px-16 py-8 text-2xl' : 'px-12 py-6 text-xl'}
            ${isHighContrast
              ? 'bg-black text-white hover:bg-gray-800 border-2 border-black'
              : 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-2xl hover:shadow-blue-500/25'
            }
            hover:scale-105 active:scale-95
            focus:outline-none focus:ring-4 focus:ring-blue-300
            group overflow-hidden
          `}
        >
          {/* リップル効果 */}
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          
          {/* ボタンコンテンツ */}
          <div className="relative flex items-center gap-3">
            {/* タッチアイコン */}
            <div className="relative">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 11H7v8c0 1.11.89 2 2 2h6c1.11 0 2-.89 2-2v-8h-2v8H9v-8zm3-9C8.69 2 6 4.69 6 8v3h2V8c0-2.21 1.79-4 4-4s4 1.79 4 4v3h2V8c0-3.31-2.69-6-6-6z"/>
              </svg>
              
              {/* パルスアニメーション */}
              <div className="absolute inset-0 rounded-full border-2 border-current animate-ping opacity-30"></div>
              <div className="absolute inset-0 rounded-full border-2 border-current animate-ping opacity-20" style={{animationDelay: '0.2s'}}></div>
            </div>
            
            <span>
              {language === 'ja' ? 'タッチして開始' : 'Touch to Start'}
            </span>
          </div>
        </button>
      </div>

      {/* 指アニメーション */}
      <div className="mt-8 animate-[bounce_2s_infinite] opacity-80">
        <div className="flex flex-col items-center">
          {/* 新しい手のアイコン */}
          <svg className="w-16 h-16 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 11.2V8.4c0-1 .8-1.8 1.8-1.8h.4c1 0 1.8.8 1.8 1.8v2.8" strokeLinecap="round"/>
            <path d="M13 11.2V7c0-1 .8-1.8 1.8-1.8h.4c1 0 1.8.8 1.8 1.8v4.2" strokeLinecap="round"/>
            <path d="M5 11.2v2.4c0 1 .8 1.8 1.8 1.8h10.4c1 0 1.8-.8 1.8-1.8v-2.4" strokeLinecap="round"/>
            <path d="M5 13.6v1.2c0 2.2 1.8 4 4 4h6c2.2 0 4-1.8 4-4v-1.2" strokeLinecap="round"/>
            <path d="M10 15.2h4" strokeLinecap="round"/>
          </svg>
          <div className="relative mt-4">
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <div className="w-4 h-4 bg-blue-400 rounded-full animate-ping opacity-75"></div>
              <div className="absolute top-0 left-0 w-4 h-4 bg-blue-500 rounded-full"></div>
            </div>
            <span className="text-sm text-gray-400 mt-4 block">
              {language === 'ja' ? 'タップしてください' : 'Please tap'}
            </span>
          </div>
        </div>
      </div>

      {/* 装飾的な要素 - より目立つように調整 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-blue-300 rounded-full animate-float opacity-70" style={{animationDelay: '0s'}}></div>
        <div className="absolute top-1/3 right-1/4 w-4 h-4 bg-green-300 rounded-full animate-float opacity-70" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-1/3 left-1/3 w-3 h-3 bg-purple-300 rounded-full animate-float opacity-70" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-1/4 right-1/3 w-3 h-3 bg-pink-300 rounded-full animate-float opacity-70" style={{animationDelay: '1.5s'}}></div>
      </div>
    </div>
  )
}