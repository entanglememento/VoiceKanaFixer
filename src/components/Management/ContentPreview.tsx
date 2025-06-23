'use client'

import { useState } from 'react'
import { Language, OptimizedChatFlow, ChatNode } from '@/types'
import { createVoiceFileGenerator, VoiceGenerationResult } from '@/services/voiceFileGenerator'
import FlowVisualization from './FlowVisualization'

interface ContentPreviewProps {
  flowData: OptimizedChatFlow
  language: Language
  selectedSpeaker?: number
  onSpeakerChange?: (speakerId: number) => void
  onContentUpdate?: (nodeId: string, content: string) => void
}

interface PreviewState {
  selectedNode: string | null
  isPlaying: boolean
  currentAudio: HTMLAudioElement | null
  generationResults: VoiceGenerationResult[]
  isGenerating: boolean
  generationProgress: {
    current: string
    completed: number
    total: number
  }
}

export default function ContentPreview({ 
  flowData, 
  language,
  selectedSpeaker = 3,
  onContentUpdate 
}: ContentPreviewProps) {
  const [previewState, setPreviewState] = useState<PreviewState>({
    selectedNode: null,
    isPlaying: false,
    currentAudio: null,
    generationResults: [],
    isGenerating: false,
    generationProgress: { current: '', completed: 0, total: 0 }
  })

  const [showFlowGraph, setShowFlowGraph] = useState(false)
  const voiceGenerator = createVoiceFileGenerator()

  const getCurrentNodes = (): Record<string, ChatNode> => {
    return flowData.languages[language]?.nodes || {}
  }

  const getNodesByType = (type: string): Array<[string, ChatNode]> => {
    const nodes = getCurrentNodes()
    return Object.entries(nodes).filter(([, node]) => node.type === type)
  }

  const playAudio = async (nodeId: string, node: ChatNode) => {
    // Stop current audio
    if (previewState.currentAudio) {
      previewState.currentAudio.pause()
      previewState.currentAudio = null
    }

    setPreviewState(prev => ({ ...prev, isPlaying: true, selectedNode: nodeId }))

    try {
      // Check if we have a generated audio file
      const result = previewState.generationResults.find(r => r.nodeId === nodeId)
      let audioUrl: string

      if (result?.audioUrl) {
        audioUrl = result.audioUrl
      } else {
        // Generate audio on-demand
        audioUrl = await voiceGenerator.generateVoiceFile(
          node.content,
          node.voiceFile || nodeId,
          language
        )
      }

      const audio = new Audio(audioUrl)
      
      audio.onended = () => {
        setPreviewState(prev => ({ 
          ...prev, 
          isPlaying: false, 
          currentAudio: null,
          selectedNode: null 
        }))
      }

      audio.onerror = () => {
        console.error('Audio playback failed')
        setPreviewState(prev => ({ 
          ...prev, 
          isPlaying: false, 
          currentAudio: null,
          selectedNode: null 
        }))
      }

      setPreviewState(prev => ({ ...prev, currentAudio: audio }))
      await audio.play()

    } catch (error) {
      console.error('Failed to play audio:', error)
      setPreviewState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        selectedNode: null 
      }))
    }
  }

  const stopAudio = () => {
    if (previewState.currentAudio) {
      previewState.currentAudio.pause()
      previewState.currentAudio = null
    }
    setPreviewState(prev => ({ 
      ...prev, 
      isPlaying: false, 
      selectedNode: null 
    }))
  }

  const generateAllAudio = async () => {
    const nodes = getCurrentNodes()
    setPreviewState(prev => ({ 
      ...prev, 
      isGenerating: true,
      generationProgress: { current: '', completed: 0, total: Object.keys(nodes).length }
    }))

    try {
      // Create custom voice generator with selected speaker
      const { createVoicevoxService } = await import('@/services/voicevoxService')
      const voicevoxService = createVoicevoxService()
      
      const results: VoiceGenerationResult[] = []
      const nodeEntries = Object.entries(nodes)
      
      for (let i = 0; i < nodeEntries.length; i++) {
        const [nodeId, node] = nodeEntries[i]
        
        setPreviewState(prev => ({
          ...prev,
          generationProgress: {
            current: nodeId,
            completed: i,
            total: nodeEntries.length
          }
        }))

        try {
          if (node.content.trim()) {
            const audioUrl = await voicevoxService.saveAudioFile(
              node.content,
              node.voiceFile || nodeId,
              selectedSpeaker
            )
            
            results.push({
              nodeId,
              audioKey: node.voiceFile || nodeId,
              originalText: node.content,
              optimizedText: node.content,
              audioUrl,
              duration: Date.now()
            })
          }
        } catch (error) {
          results.push({
            nodeId,
            audioKey: node.voiceFile || nodeId,
            originalText: node.content,
            optimizedText: node.content,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
        
        // 少し待機してブラウザを詰まらせないように
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      setPreviewState(prev => ({
        ...prev,
        generationResults: results,
        isGenerating: false,
        generationProgress: { current: '', completed: 0, total: 0 }
      }))

      // Show generation report
      const successful = results.filter(r => !r.error).length
      const failed = results.filter(r => r.error).length
      alert(`音声生成完了！\n成功: ${successful}個\n失敗: ${failed}個\n話者: ${getSpeakerName(selectedSpeaker)}`)

    } catch (error) {
      console.error('Batch audio generation failed:', error)
      setPreviewState(prev => ({ 
        ...prev, 
        isGenerating: false,
        generationProgress: { current: '', completed: 0, total: 0 }
      }))
    }
  }

  const getSpeakerName = (speakerId: number): string => {
    // 話者IDから名前を取得
    const speakerMap: Record<number, string> = {
      0: '四国めたん（甘え）',
      1: 'ずんだもん（甘え）',
      2: '四国めたん（ノーマル）',
      3: 'ずんだもん（ノーマル）',
      4: '四国めたん（セクシー）',
      5: 'ずんだもん（セクシー）',
      6: '四国めたん（ツンツン）',
      7: 'ずんだもん（ツンツン）',
      8: '春日部つむぎ',
      9: '波音リツ',
      10: '雨晴はう',
      11: '玄野武宏（ノーマル）'
    }
    return speakerMap[speakerId] || `話者ID: ${speakerId}`
  }

  const renderNodeCard = (nodeId: string, node: ChatNode) => {
    const isSelected = previewState.selectedNode === nodeId
    const isCurrentlyPlaying = previewState.isPlaying && isSelected
    const generationResult = previewState.generationResults.find(r => r.nodeId === nodeId)

    return (
      <div
        key={nodeId}
        className={`border rounded-lg p-3 sm:p-4 transition-all ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{nodeId}</h3>
            <span className={`text-xs px-2 py-1 rounded inline-block mt-1 ${
              node.type === 'message' ? 'bg-green-100 text-green-800' :
              node.type === 'choice' ? 'bg-blue-100 text-blue-800' :
              node.type === 'input' ? 'bg-yellow-100 text-yellow-800' :
              'bg-purple-100 text-purple-800'
            }`}>
              {node.type}
            </span>
          </div>
          
          <div className="flex gap-1 sm:gap-2 flex-shrink-0">
            {/* Play/Stop Button */}
            <button
              onClick={() => isCurrentlyPlaying ? stopAudio() : playAudio(nodeId, node)}
              disabled={previewState.isGenerating}
              className={`p-1.5 sm:p-2 rounded ${
                isCurrentlyPlaying
                  ? 'bg-red-100 hover:bg-red-200 text-red-600'
                  : 'bg-green-100 hover:bg-green-200 text-green-600'
              } disabled:opacity-50`}
              title={isCurrentlyPlaying ? 'Stop' : 'Play'}
            >
              {isCurrentlyPlaying ? (
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            {/* Edit Button */}
            <button
              onClick={() => onContentUpdate?.(nodeId, node.content)}
              className="p-1.5 sm:p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded"
              title="編集"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="text-gray-700 mb-3 leading-relaxed">
          {node.content}
        </div>

        {/* Audio Key */}
        {node.voiceFile && (
          <div className="text-xs text-gray-500 mb-2">
            Audio Key: {node.voiceFile}
          </div>
        )}

        {/* Generation Status */}
        {generationResult && (
          <div className="border-t pt-2">
            {generationResult.error ? (
              <div className="text-xs text-red-600">
                Error: {generationResult.error}
              </div>
            ) : (
              <div className="text-xs text-green-600">
                ✓ Audio generated ({generationResult.duration ? `${Math.round(generationResult.duration)}ms` : 'unknown time'})
              </div>
            )}
          </div>
        )}

        {/* Choices */}
        {node.choices && node.choices.length > 0 && (
          <div className="border-t pt-3 mt-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Choices:</h4>
            <div className="space-y-1">
              {node.choices.map((choice) => (
                <div key={choice.id} className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                  <span className="font-medium">{choice.text}</span>
                  {choice.keywords && choice.keywords.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Keywords: {choice.keywords.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const nodeTypes = ['message', 'choice', 'input', 'confirmation']
  const allNodes = getCurrentNodes()

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              コンテンツプレビュー
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              {language === 'ja' ? '日本語' : '英語'}コンテンツのプレビューとテスト
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowFlowGraph(!showFlowGraph)}
              className="px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm flex-1 sm:flex-initial"
            >
              {showFlowGraph ? 'フロー非表示' : 'フロー表示'}
            </button>
            <button
              onClick={generateAllAudio}
              disabled={previewState.isGenerating}
              className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 text-sm flex-1 sm:flex-initial"
            >
              {previewState.isGenerating ? '生成中...' : '全音声ファイル生成'}
            </button>
          </div>
        </div>

        {/* Generation Progress */}
        {previewState.isGenerating && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-800">音声ファイル生成中...</span>
              <span className="text-blue-600">
                {previewState.generationProgress.completed} / {previewState.generationProgress.total}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(previewState.generationProgress.completed / previewState.generationProgress.total) * 100}%` 
                }}
              />
            </div>
            {previewState.generationProgress.current && (
              <div className="text-sm text-blue-600 mt-1">
                現在処理中: {previewState.generationProgress.current}
              </div>
            )}
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {nodeTypes.map(type => (
            <div key={type} className="bg-white border rounded-lg p-3 sm:p-4">
              <div className="text-xl sm:text-2xl font-bold text-gray-900">
                {getNodesByType(type).length}
              </div>
              <div className="text-sm text-gray-600 capitalize">
                {type} nodes
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Flow Graph */}
      {showFlowGraph && (
        <div className="mb-6">
          <FlowVisualization
            flowData={flowData}
            language={language}
            onNodeSelect={(nodeId) => setPreviewState(prev => ({ ...prev, selectedNode: nodeId }))}
            selectedNode={previewState.selectedNode || undefined}
          />
        </div>
      )}

      {/* Nodes by Type */}
      {nodeTypes.map(type => {
        const nodesOfType = getNodesByType(type)
        if (nodesOfType.length === 0) return null

        const typeLabels = {
          'message': 'メッセージノード',
          'choice': '選択肢ノード', 
          'input': '入力ノード',
          'confirmation': '確認ノード'
        }

        return (
          <div key={type} className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
              {typeLabels[type as keyof typeof typeLabels]} ({nodesOfType.length}個)
            </h2>
            <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
              {nodesOfType.map(([nodeId, node]) => renderNodeCard(nodeId, node))}
            </div>
          </div>
        )
      })}

      {Object.keys(allNodes).length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg">
            {language === 'ja' ? '日本語' : '英語'}のコンテンツがありません
          </div>
        </div>
      )}
    </div>
  )
}