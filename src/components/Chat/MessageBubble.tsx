'use client'

import { useState, useEffect, useRef } from 'react'
import { ChatMessage } from '@/types'
import React from 'react'

interface MessageBubbleProps {
  message: ChatMessage
  isLarge?: boolean
  isHighContrast?: boolean
  voiceFile?: string
  onUserInteraction?: () => void
}

export default function MessageBubble({ 
  message, 
  isLarge = false,
  isHighContrast = false,
  voiceFile,
  onUserInteraction
}: MessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioExists, setAudioExists] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // 音声ファイルの存在チェック
    if (voiceFile) {
      const audioPath = `/audio/ja/${voiceFile}.wav`
      fetch(audioPath)
        .then(response => {
          setAudioExists(response.ok)
          if (response.ok) {
            audioRef.current = new Audio(audioPath)
            audioRef.current.onended = () => setIsPlaying(false)
          }
        })
        .catch(() => setAudioExists(false))
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [voiceFile])

  const toggleAudio = () => {
    onUserInteraction?.() // Stop any other playing voice
    
    if (!audioRef.current || !audioExists) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(error => {
          console.error('音声再生エラー:', error)
          setIsPlaying(false)
        })
    }
  }

  const isBot = message.type === 'bot'
  
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4 sm:mb-6 animate-[slideInUp_0.5s_ease-out] ${isBot ? 'pl-2 sm:pl-4' : 'pr-2 sm:pr-4'}`}>
      <div className={`max-w-[90%] sm:max-w-[80%] relative group ${
        isBot ? 'order-2 ml-2 sm:ml-4' : 'order-2'
      }`}>
        {/* Message bubble */}
        <div className={`
          relative px-4 sm:px-6 py-3 sm:py-4 rounded-3xl shadow-lg backdrop-blur-sm transition-all duration-300 transform group-hover:scale-[1.02]
          ${isBot
            ? `bg-gradient-to-br from-gray-50 to-white border border-gray-200 text-gray-800 rounded-bl-lg
               ${isHighContrast ? 'bg-white border-2 border-black text-black' : ''}`
            : `bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-lg shadow-blue-200
               ${isHighContrast ? 'bg-black text-white' : ''}`
          }
          ${isLarge ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}
        `}>
          {/* Message content */}
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="flex-grow leading-relaxed">
              {message.content}
            </div>
            
            {/* Audio button for bot messages */}
            {isBot && audioExists && (
              <button
                onClick={toggleAudio}
                className={`
                  flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center touch-button
                  transition-all duration-300 transform hover:scale-110 active:scale-95
                  ${isPlaying 
                    ? 'bg-red-100 hover:bg-red-200 text-red-600' 
                    : 'bg-green-100 hover:bg-green-200 text-green-600'
                  }
                  ${isHighContrast ? 'border-2 border-black' : ''}
                  shadow-md hover:shadow-lg
                `}
                title={isPlaying ? '一時停止' : '音声再生'}
              >
                {isPlaying ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )}
          </div>
          
          {/* Message tail */}
          <div className={`
            absolute top-4 w-4 h-4 transform rotate-45
            ${isBot 
              ? `${isHighContrast ? 'bg-white border-l-2 border-b-2 border-black' : 'bg-white border-l border-b border-gray-200'} -left-2`
              : `${isHighContrast ? 'bg-black' : 'bg-blue-500'} -right-2`
            }
          `} />
        </div>
        
        {/* Timestamp */}
        <div className={`
          mt-2 text-xs opacity-70
          ${isBot ? 'text-left' : 'text-right'}
          ${isHighContrast ? 'text-black' : 'text-gray-500'}
        `}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        
      </div>
      
      {/* Avatar for bot - positioned separately to avoid cutoff */}
      {isBot && (
        <div className="order-1 w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-lg flex-shrink-0">
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  )
}