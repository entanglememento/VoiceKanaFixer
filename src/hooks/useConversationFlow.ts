'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChatState, ChatMessage, OptimizedChatFlow, Language, ChatNode, Choice } from '@/types'
import { KeywordMatcher, MatchResult, ResponseStrategy } from '@/services/keywordMatcher'

interface ConversationFlowHook {
  chatState: ChatState
  currentNode: ChatNode | null
  currentChoices: Choice[]
  isLoading: boolean
  error: string | null
  pendingConfirmation: { choice: Choice; matchResult: MatchResult } | null
  handleChoiceSelect: (choice: Choice) => void
  handleTextInput: (text: string) => void
  handleInputSubmit: (value: string) => void
  handleConfirmationSubmit: (isConfirmed: boolean) => void
  handleConfirmationResponse: (isConfirmed: boolean) => void
  resetConversation: () => void
  addBotMessage: (content: string) => void
}

export function useConversationFlow(
  flowData: OptimizedChatFlow | null,
  language: Language
): ConversationFlowHook {
  const [chatState, setChatState] = useState<ChatState>({
    currentNode: 'start',
    language,
    history: [],
    userInputs: {},
    isComplete: false
  })
  
  const [isLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    choice: Choice
    matchResult: MatchResult
  } | null>(null)
  
  const currentLanguageData = flowData?.languages[language]
  const currentNode = currentLanguageData?.nodes[chatState.currentNode] || null
  
  // Get choices for current node
  const currentChoices = currentNode?.choices || []
  
  // Initialize keyword matcher
  const keywordMatcher = new KeywordMatcher({
    highConfidenceThreshold: 0.8,
    mediumConfidenceThreshold: 0.5,
    enableFuzzyMatching: true,
    enableSimilarityMatching: true
  })
  
  // Add bot message
  const addBotMessage = useCallback((content: string) => {
    const botMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'bot',
      content,
      timestamp: new Date()
    }
    
    setChatState(prevState => ({
      ...prevState,
      history: [...prevState.history, botMessage]
    }))
  }, [])
  
  // Handle choice selection
  const handleChoiceSelect = (choice: Choice) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: choice.text,
      timestamp: new Date()
    }
    
    setChatState(prevState => ({
      ...prevState,
      history: [...prevState.history, userMessage],
      currentNode: choice.next
    }))
  }
  
  // Handle text input with sophisticated keyword matching
  const handleTextInput = (text: string) => {
    if (!currentChoices.length) return
    
    // Add user message first
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date()
    }
    
    setChatState(prevState => ({
      ...prevState,
      history: [...prevState.history, userMessage]
    }))
    
    // Use sophisticated keyword matching
    const matchResult = keywordMatcher.getBestMatch(text, currentChoices)
    const response = ResponseStrategy.determineResponse(matchResult, keywordMatcher)
    
    setTimeout(() => {
      switch (response.type) {
        case 'direct':
          // High confidence - direct transition
          if (response.data && typeof response.data === 'object' && 'choice' in response.data) {
            handleChoiceSelect(response.data.choice as Choice)
          }
          break
          
        case 'confirmation':
          // Medium confidence - ask for confirmation
          if (response.data && typeof response.data === 'object' && 'choice' in response.data) {
            const choice = response.data.choice as Choice
            setPendingConfirmation({
              choice,
              matchResult: response.data as MatchResult
            })
            addBotMessage(
              language === 'ja'
                ? `「${choice.text}」についてのご質問でしょうか？`
                : `Are you asking about "${choice.text}"?`
            )
          }
          break
          
        case 'choices':
          // Low confidence - show options
          const topMatches = keywordMatcher.findBestMatches(text, currentChoices).slice(0, 3)
          if (topMatches.length > 0) {
            const choiceList = topMatches.map(m => `・${m.choice.text}`).join('\n')
            addBotMessage(
              language === 'ja'
                ? `以下のいずれかでしょうか？\n\n${choiceList}\n\n該当するものをお選びください。`
                : `Did you mean one of these?\n\n${choiceList}\n\nPlease select the appropriate option.`
            )
          } else {
            addBotMessage(
              language === 'ja'
                ? 'すみません、よく聞き取れませんでした。選択肢からお選びいただくか、もう一度お聞かせください。'
                : 'Sorry, I didn\'t understand. Please select from the options or try again.'
            )
          }
          break
          
        case 'fallback':
        default:
          addBotMessage(
            language === 'ja'
              ? 'すみません、よく聞き取れませんでした。選択肢からお選びいただくか、もう一度お聞かせください。'
              : 'Sorry, I didn\'t understand. Please select from the options or try again.'
          )
          break
      }
    }, 500) // Slight delay for natural conversation flow
  }

  // Handle input submission (for forms like amount, account number, etc.)
  const handleInputSubmit = useCallback((value: string) => {
    if (!currentNode || currentNode.type !== 'input') return
    
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: value,
      timestamp: new Date()
    }
    
    // Check for special conditions that require staff assistance
    const numValue = parseInt(value.replace(/[^0-9]/g, ''))
    const isAmountField = currentNode.field?.includes('Amount') || currentNode.id.includes('amount')
    
    if (isAmountField && numValue > 200000) {
      // Amount exceeds 200,000 yen - requires staff assistance
      setChatState(prevState => ({
        ...prevState,
        history: [...prevState.history, userMessage],
        currentNode: 'staff_assistance_amount'
      }))
      return
    }
    
    // Store the input value and move to next node
    setChatState(prevState => ({
      ...prevState,
      history: [...prevState.history, userMessage],
      userInputs: {
        ...prevState.userInputs,
        [currentNode.field || currentNode.id]: value
      },
      currentNode: currentNode.next || 'end'
    }))
  }, [currentNode])

  // Handle confirmation submission (for confirmation nodes)
  const handleConfirmationSubmit = useCallback((isConfirmed: boolean) => {
    if (!currentNode || currentNode.type !== 'confirmation') return
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: language === 'ja' ? (isConfirmed ? 'はい' : 'いいえ') : (isConfirmed ? 'Yes' : 'No'),
      timestamp: new Date()
    }
    
    if (isConfirmed) {
      // Proceed to next node
      setChatState(prevState => ({
        ...prevState,
        history: [...prevState.history, userMessage],
        currentNode: currentNode.next || 'end'
      }))
    } else {
      // Go back to previous step or restart
      setChatState(prevState => ({
        ...prevState,
        history: [...prevState.history, userMessage],
        currentNode: 'transaction_type' // Go back to transaction selection
      }))
    }
  }, [currentNode, language])
  
  // Handle confirmation response
  const handleConfirmationResponse = (isConfirmed: boolean) => {
    if (!pendingConfirmation) return
    
    if (isConfirmed) {
      handleChoiceSelect(pendingConfirmation.choice)
    } else {
      addBotMessage(
        language === 'ja'
          ? '失礼いたしました。改めてご用件をお聞かせください。'
          : 'I apologize. Please let me know how I can help you.'
      )
    }
    
    setPendingConfirmation(null)
  }
  
  
  // Reset conversation
  const resetConversation = () => {
    setChatState({
      currentNode: 'start',
      language,
      history: [],
      userInputs: {},
      isComplete: false
    })
    setError(null)
  }
  
  // Process current node when it changes
  useEffect(() => {
    if (!currentNode) return
    
    // Add bot message for current node, but avoid duplicates by checking both content and node ID
    if (currentNode.type === 'message' || currentNode.type === 'choice') {
      const lastMessage = chatState.history[chatState.history.length - 1]
      const isDuplicate = lastMessage && 
        (lastMessage.content === currentNode.content || 
         (lastMessage as any).nodeId === currentNode.id)
      
      if (!isDuplicate) {
        addBotMessage(currentNode.content)
        // Mark the message with nodeId to prevent duplicates
        setChatState(prevState => {
          const updatedHistory = [...prevState.history]
          const lastMsg = updatedHistory[updatedHistory.length - 1]
          if (lastMsg) {
            (lastMsg as any).nodeId = currentNode.id
          }
          return { ...prevState, history: updatedHistory }
        })
      }
    }
    
    // Auto-progress for message-only nodes
    if (currentNode.type === 'message' && currentNode.next) {
      const timer = setTimeout(() => {
        setChatState(prevState => ({
          ...prevState,
          currentNode: currentNode.next!
        }))
      }, 2000) // Wait 2 seconds before auto-progressing
      
      return () => clearTimeout(timer)
    }
  }, [chatState.currentNode, currentNode, addBotMessage])
  
  return {
    chatState,
    currentNode,
    currentChoices,
    isLoading,
    error,
    pendingConfirmation,
    handleChoiceSelect,
    handleTextInput,
    handleInputSubmit,
    handleConfirmationSubmit,
    handleConfirmationResponse,
    resetConversation,
    addBotMessage
  }
}