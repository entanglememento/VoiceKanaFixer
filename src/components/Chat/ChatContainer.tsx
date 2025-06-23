'use client'

import { useState, useRef, useEffect } from 'react'
import { Language, OptimizedChatFlow } from '@/types'
import { useConversationFlow } from '@/hooks/useConversationFlow'
import { useVoice } from '@/hooks/useVoice'
import { getRealBankingFlowFromConfiguration, getRealBankingFlowFromConfigurationSync, clearFlowCache } from '@/utils/realBankingFlowConverter'
import MessageBubble from './MessageBubble'
import ChoiceButtons from './ChoiceButtons'
import ConfirmationButtons from './ConfirmationButtons'
import InputField from './InputField'
import ConfirmationField from './ConfirmationField'
import QRCodeDisplay from './QRCodeDisplay'
import ProgressNavigation from './ProgressNavigation'

interface ChatContainerProps {
  language: Language
  isLarge?: boolean
  isHighContrast?: boolean
  onHomeClick?: () => void
}

export default function ChatContainer({ 
  language, 
  isLarge = false,
  isHighContrast = false,
  onHomeClick 
}: ChatContainerProps) {
  const [flowData, setFlowData] = useState<OptimizedChatFlow>(() => getRealBankingFlowFromConfigurationSync())
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // OpenAI APIを使用してフローデータを非同期で取得
  useEffect(() => {
    const loadFlowData = async () => {
      try {
        // キャッシュをクリアして最新のフローデータを取得
        clearFlowCache()
        const data = await getRealBankingFlowFromConfiguration()
        setFlowData(data)
        console.log('Flow data loaded:', data.languages.ja.nodes.language_selection?.voiceFile)
      } catch (error) {
        console.error('Failed to load flow data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadFlowData()
  }, [])
  
  const {
    chatState,
    currentNode,
    currentChoices,
    pendingConfirmation,
    handleChoiceSelect,
    handleTextInput,
    handleInputSubmit,
    handleConfirmationSubmit,
    handleConfirmationResponse
  } = useConversationFlow(flowData, language)

  // Voice functionality
  const {
    isRecording,
    isSpeaking,
    isRecognitionSupported,
    isOutputSupported,
    startRecording,
    stopRecording,
    speak,
    stopSpeaking,
    error: voiceError,
    clearError: clearVoiceError
  } = useVoice({
    language,
    autoStopSeconds: 3,
    volume: 0.8,
    speechRate: 1.0,
    onSpeechResult: handleTextInput,
    onSpeechStart: () => {
      // Stop any current speech output when recording starts
      stopSpeaking()
    },
    onError: (error) => {
      console.error('Voice error:', error)
    }
  })

  // Handle user interactions that should stop voice
  const handleUserInteraction = () => {
    if (isSpeaking) {
      stopSpeaking()
    }
  }

  // Enhanced choice select handler
  const handleChoiceSelectWithVoiceStop = (choice: any) => {
    handleUserInteraction()
    handleChoiceSelect(choice)
  }

  // Enhanced recording handlers
  const handleStartRecordingWithVoiceStop = () => {
    handleUserInteraction()
    startRecording()
  }

  const handleNewTransaction = () => {
    // Stop any playing voice before resetting
    handleUserInteraction()
    // Reset chat state to start a new transaction
    window.location.reload()
  }

  // Enhanced home click handler
  const handleHomeClickWithVoiceStop = () => {
    handleUserInteraction()
    onHomeClick?.()
  }
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(scrollToBottom, [chatState.history])

  // QRコード表示時に自動スクロール
  useEffect(() => {
    if (currentNode?.id === 'qr_code_display') {
      scrollToBottom()
    }
  }, [currentNode?.id])

  // フローデータの更新をチェック (5秒ごと)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const latestFlow = await getRealBankingFlowFromConfiguration()
        
        // 現在のフローデータと比較して更新があるかチェック
        const currentFlowString = JSON.stringify(flowData)
        const latestFlowString = JSON.stringify(latestFlow)
        
        if (currentFlowString !== latestFlowString) {
          console.log('Flow data updated, refreshing...')
          setFlowData(latestFlow)
        }
      } catch {
        // エラーは無視（ログは既に出力されている）
      }
    }, 5000) // 5秒ごとにチェック

    return () => clearInterval(interval)
  }, [flowData])

  // Auto-speak bot messages (only once per message)
  useEffect(() => {
    if (currentNode && isOutputSupported && !isSpeaking && !isRecording) {
      const lastMessage = chatState.history[chatState.history.length - 1]
      if (lastMessage && lastMessage.type === 'bot' && lastMessage.content && !lastMessage.hasBeenSpoken) {
        // Mark message as spoken to prevent repetition
        lastMessage.hasBeenSpoken = true
        
        // Speak the bot message with audio key (voiceFile is now audioKey)
        console.log('Auto-speak triggered:', {
          nodeId: currentNode.id,
          content: lastMessage.content,
          voiceFile: currentNode.voiceFile
        })
        
        // Only attempt to speak if we have a voice file, otherwise skip silently
        if (currentNode.voiceFile) {
          speak(lastMessage.content, currentNode.voiceFile)
        } else {
          console.log(`ノード ${currentNode.id} には音声ファイルが設定されていません - 音声再生をスキップします`)
        }
      }
    }
  }, [currentNode, chatState.history, isOutputSupported, isSpeaking, isRecording, speak])
  
  // Check if chat is complete (QR code is displayed)
  const isChatComplete = currentNode?.id === 'qr_code_display'

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-900">
      {/* Header */}
      <div className={`
        flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b backdrop-blur-md min-h-[72px] sm:min-h-[88px]
        ${isHighContrast 
          ? 'bg-white border-black' 
          : 'bg-white/80 dark:bg-gray-800/80 border-gray-200/50 dark:border-gray-700/50 shadow-sm'
        }
      `}>
        {/* Left side - Title with more generous spacing */}
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 mr-3 sm:mr-6">
          <div className={`
            rounded-full flex items-center justify-center flex-shrink-0 shadow-md
            ${isLarge ? 'w-12 h-12 sm:w-16 sm:h-16' : 'w-10 h-10 sm:w-14 sm:h-14'}
            ${isHighContrast ? 'bg-black text-white' : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'}
          `}>
            <svg className={`${isLarge ? 'w-6 h-6 sm:w-9 sm:h-9' : 'w-5 h-5 sm:w-8 sm:h-8'}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className={`
            font-bold truncate
            ${isLarge ? 'text-lg sm:text-2xl' : 'text-base sm:text-xl'}
            ${isHighContrast ? 'text-black' : 'text-gray-800 dark:text-white'}
          `}>
            {language === 'ja' ? 'ATMサポート' : 'ATM Support'}
          </h1>
        </div>
        
        {/* Right side - Home button with better spacing */}
        <div className="flex-shrink-0">
          <button
            onClick={handleHomeClickWithVoiceStop}
            className={`
              rounded-xl font-medium transition-all duration-200 flex-shrink-0 shadow-md touch-button
              ${isHighContrast
                ? 'bg-black text-white hover:bg-gray-800'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white'
              }
              ${isLarge ? 'text-sm sm:text-lg px-3 sm:px-6 py-2 sm:py-3' : 'text-xs sm:text-base px-2 sm:px-4 py-2 sm:py-2.5'}
              focus:outline-none focus:ring-4 focus:ring-gray-300
              hover:scale-105 active:scale-95
            `}
          >
            <div className="flex items-center gap-1 sm:gap-2">
              <svg className={`${isLarge ? 'w-4 h-4 sm:w-6 sm:h-6' : 'w-4 h-4 sm:w-5 sm:h-5'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              <span className="whitespace-nowrap font-semibold hidden sm:inline">
                {language === 'ja' ? 'ホーム' : 'Home'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Progress Navigation */}
      {!isLoading && currentNode && (
        <ProgressNavigation
          currentNodeId={currentNode.id}
          language={language}
          isLarge={isLarge}
          isHighContrast={isHighContrast}
          flowData={flowData}
          userInputs={chatState.userInputs}
        />
      )}
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 relative">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), 
                             radial-gradient(circle at 75% 75%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)`
          }}></div>
        </div>
        
        <div className="relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center animate-[fadeInScale_0.6s_ease-out]">
              <div className="relative mb-6">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 mx-auto"></div>
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-blue-500 border-r-blue-500 absolute top-0 left-1/2 transform -translate-x-1/2"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="space-y-2">
                <p className={`
                  font-semibold
                  ${isLarge ? 'text-xl' : 'text-lg'}
                  ${isHighContrast ? 'text-black' : 'text-gray-700 dark:text-gray-300'}
                `}>
                  {language === 'ja' 
                    ? 'システムを準備しています...' 
                    : 'Preparing system...'
                  }
                </p>
                <div className="flex justify-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        ) : chatState.history.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-2xl animate-[fadeInScale_0.8s_ease-out]">
              <div className="mb-8">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-2xl animate-float">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <h2 className={`
                font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent
                ${isLarge ? 'text-3xl' : 'text-2xl'}
              `}>
                {language === 'ja' 
                  ? 'いらっしゃいませ' 
                  : 'Welcome'
                }
              </h2>
              <p className={`
                leading-relaxed
                ${isLarge ? 'text-xl' : 'text-lg'}
                ${isHighContrast ? 'text-black' : 'text-gray-600 dark:text-gray-300'}
              `}>
                {language === 'ja' 
                  ? 'ATMサービスをご利用いただき、ありがとうございます。お手伝いできることがございましたら、お気軽にお声かけください。' 
                  : 'Welcome to our ATM service. Thank you for choosing us. Please let us know how we can assist you today.'
                }
              </p>
              <div className="mt-6 flex justify-center">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {chatState.history.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLarge={isLarge}
                isHighContrast={isHighContrast}
                voiceFile={message.type === 'bot' ? currentNode?.voiceFile : undefined}
                onUserInteraction={handleUserInteraction}
              />
            ))}
            
            {/* QR Code Display */}
            {currentNode?.id === 'qr_code_display' && (
              <div className="mt-6">
                <QRCodeDisplay
                  language={language}
                  isLarge={isLarge}
                  isHighContrast={isHighContrast}
                  userInputs={chatState.userInputs}
                  currentNode={currentNode.id}
                  onComplete={handleNewTransaction}
                />
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Input Area */}
      <div className={`
        p-3 sm:p-6 border-t backdrop-blur-md relative
        ${isHighContrast 
          ? 'bg-white border-black' 
          : 'bg-white/90 dark:bg-gray-800/90 border-gray-200/30 dark:border-gray-700/30 shadow-lg'
        }
      `}>
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent pointer-events-none"></div>
        <div className="relative z-10">
        {/* Input Field (for input nodes) */}
        {currentNode?.type === 'input' ? (
          <InputField
            field={currentNode.field || currentNode.id}
            label={currentNode.label || currentNode.content}
            onSubmit={handleInputSubmit}
            language={language}
            isLarge={isLarge}
            isHighContrast={isHighContrast}
            onVoiceResult={handleTextInput}
            isRecording={isRecording}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            voiceError={voiceError}
            isVoiceSupported={isRecognitionSupported}
            onUserInteraction={handleUserInteraction}
          />
        ) : currentNode?.type === 'confirmation' ? (
          /* Confirmation Field (for confirmation nodes) */
          <ConfirmationField
            content={currentNode.content}
            field={currentNode.field}
            label={currentNode.label}
            userInputs={chatState.userInputs}
            onConfirm={handleConfirmationSubmit}
            language={language}
            isLarge={isLarge}
            isHighContrast={isHighContrast}
          />
        ) : (
          <>
            {/* Confirmation Buttons (for medium confidence matches) */}
            {pendingConfirmation ? (
              <ConfirmationButtons
                onConfirm={handleConfirmationResponse}
                language={language}
                isLarge={isLarge}
                isHighContrast={isHighContrast}
                suggestion={pendingConfirmation.choice.text}
                onUserInteraction={handleUserInteraction}
              />
            ) : (
              /* Choice Buttons */
              currentChoices.length > 0 && (
                <ChoiceButtons
                  choices={currentChoices}
                  onChoiceSelect={handleChoiceSelectWithVoiceStop}
                  isLarge={isLarge}
                  isHighContrast={isHighContrast}
                />
              )
            )}
          </>
        )}
        
        {/* Voice Input Button */}
        {!isChatComplete && 
         isRecognitionSupported && 
         currentChoices.length > 0 && (
          <div className="flex justify-center mt-4 sm:mt-6">
            <button
              onClick={isRecording ? stopRecording : handleStartRecordingWithVoiceStop}
              disabled={isSpeaking}
              className={`
                relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center touch-button
                transform transition-all duration-300 group
                ${isRecording
                  ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 scale-110'
                  : isSpeaking
                    ? 'bg-gradient-to-br from-gray-400 to-gray-500 cursor-not-allowed'
                    : isHighContrast
                      ? 'bg-black hover:bg-gray-800 text-white'
                      : 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                }
                text-white shadow-2xl hover:shadow-blue-500/25
                focus:outline-none focus:ring-4 focus:ring-blue-300
                hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:hover:scale-100
                overflow-hidden
              `}
            >
              {/* Ripple effect */}
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              
              {/* Recording animation rings */}
              {isRecording && (
                <>
                  <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping"></div>
                  <div className="absolute inset-2 rounded-full border-2 border-white/20 animate-ping" style={{animationDelay: '0.2s'}}></div>
                </>
              )}
              
              {/* Microphone Icon */}
              <div className="relative">
                {isSpeaking ? (
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  </svg>
                ) : isRecording ? (
                  <div className="flex flex-col items-center">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2s-2-.9-2-2V4c0-1.1.9-2 2-2z"/>
                      <path d="M19 10v2c0 3.53-2.61 6.43-6 6.92V21h2v2H9v-2h2v-2.08c-3.39-.49-6-3.39-6-6.92v-2h2c0 2.76 2.24 5 5 5s5-2.24 5-5h2z"/>
                    </svg>
                  </div>
                ) : (
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2s-2-.9-2-2V4c0-1.1.9-2 2-2z"/>
                    <path d="M19 10v2c0 3.53-2.61 6.43-6 6.92V21h2v2H9v-2h2v-2.08c-3.39-.49-6-3.39-6-6.92v-2h2c0 2.76 2.24 5 5 5s5-2.24 5-5h2z"/>
                  </svg>
                )}
              </div>
            </button>
          </div>
        )}
        
        {/* Recording status indicator */}
        {isRecording && (
          <div className="mt-4 text-center animate-[slideInUp_0.3s_ease-out]">
            <div className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-full
              ${isHighContrast 
                ? 'bg-red-100 border-red-800 text-red-800' 
                : 'bg-red-50/80 border border-red-200 text-red-600'
              }
            `}>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">
                {language === 'ja' ? '音声を録音中...' : 'Recording...'}
              </span>
            </div>
          </div>
        )}

        {/* Voice Error Display */}
        {voiceError && (
          <div className="mt-4 text-center animate-[slideInUp_0.3s_ease-out]">
            <div className={`
              inline-block px-4 py-3 rounded-2xl backdrop-blur-sm border
              ${isHighContrast 
                ? 'bg-red-100 border-red-800 text-red-800' 
                : 'bg-red-50/80 border-red-200 text-red-600'
              }
            `}>
              <p className="text-sm font-medium">
                {language === 'ja' ? `音声エラー: ${voiceError}` : `Voice Error: ${voiceError}`}
              </p>
              <button
                onClick={clearVoiceError}
                className={`
                  text-xs underline mt-2 font-medium transition-colors duration-200
                  ${isHighContrast ? 'text-blue-800 hover:text-blue-900' : 'text-blue-500 hover:text-blue-600'}
                `}
              >
                {language === 'ja' ? 'エラーを消去' : 'Clear Error'}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}