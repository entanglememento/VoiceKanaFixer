'use client'

import { useState } from 'react'
import { Language } from '@/types'
import LanguageSelector from '@/components/Language/LanguageSelector'
import ChatContainer from '@/components/Chat/ChatContainer'
import StartScreen from '@/components/Chat/StartScreen'
import SettingsButton from '@/components/UI/SettingsButton'

type AppState = 'start' | 'language' | 'chat'

export default function Home() {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('ja')
  const [appState, setAppState] = useState<AppState>('start')
  const [isLarge, setIsLarge] = useState(false)
  const [isHighContrast, setIsHighContrast] = useState(false)

  const handleStartClick = () => {
    setAppState('language')
  }

  const handleLanguageChange = (language: Language) => {
    setCurrentLanguage(language)
    setAppState('chat')
  }

  const handleHomeClick = () => {
    setAppState('start')
  }

  const handleTextSizeToggle = () => {
    setIsLarge(!isLarge)
  }

  const handleContrastToggle = () => {
    setIsHighContrast(!isHighContrast)
  }

  // Start Screen (Reception start screen)
  if (appState === 'start') {
    return (
      <div className={`flex flex-col h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-900 ${isHighContrast ? 'bg-white' : ''}`}>
        <SettingsButton
          onTextSizeToggle={handleTextSizeToggle}
          onContrastToggle={handleContrastToggle}
          isLarge={isLarge}
          isHighContrast={isHighContrast}
          language={currentLanguage}
        />
        <StartScreen
          language={currentLanguage}
          onStart={handleStartClick}
          isLarge={isLarge}
          isHighContrast={isHighContrast}
        />
      </div>
    )
  }

  // Language Selection Screen
  if (appState === 'language') {
    return (
      <div className={`${isHighContrast ? 'bg-white min-h-screen' : ''}`}>
        <SettingsButton
          onTextSizeToggle={handleTextSizeToggle}
          onContrastToggle={handleContrastToggle}
          isLarge={isLarge}
          isHighContrast={isHighContrast}
          language={currentLanguage}
        />
        <LanguageSelector
          selectedLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
          isLarge={isLarge}
          isHighContrast={isHighContrast}
        />
      </div>
    )
  }

  // Chat Screen
  return (
    <div className={`${isHighContrast ? 'bg-white min-h-screen' : ''}`}>
      <SettingsButton
        onTextSizeToggle={handleTextSizeToggle}
        onContrastToggle={handleContrastToggle}
        isLarge={isLarge}
        isHighContrast={isHighContrast}
        language={currentLanguage}
      />
      <ChatContainer
        language={currentLanguage}
        isLarge={isLarge}
        isHighContrast={isHighContrast}
        onHomeClick={handleHomeClick}
      />
    </div>
  )
}
