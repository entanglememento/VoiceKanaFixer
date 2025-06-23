'use client'

import { useState, useEffect } from 'react'
import { Language, OptimizedChatFlow, ChatNode, VoicevoxSpeaker } from '@/types'
import { createOpenAIService } from '@/services/openaiService'
import { createVoicevoxService } from '@/services/voicevoxService'
import { createAudioFileDetector, AudioFileInfo } from '@/services/audioFileDetector'
import SpeakerSelector from './SpeakerSelector'
import { updateCachedFlow } from '@/utils/realBankingFlowConverter'

interface ContentManagerProps {
  flowData: OptimizedChatFlow
  onFlowUpdate: (updatedFlow: OptimizedChatFlow) => void
  language: Language
  selectedSpeaker?: number
  onSpeakerChange?: (speakerId: number) => void
}

interface EditState {
  content: string;
  editedContent: string;
  reading: string;
  editedReading: string;
  isGeneratingAudio: boolean;
  isTranslating: boolean;
  translatedContent?: string;
  audioUrl: string;
  audioKey: string;
}

interface EditingNodes {
  [key: string]: EditState;
}

export default function ContentManager({ 
  flowData, 
  onFlowUpdate, 
  language,
  selectedSpeaker: globalSelectedSpeaker = 3,
  onSpeakerChange: onGlobalSpeakerChange
}: ContentManagerProps) {
  const [editingNodes, setEditingNodes] = useState<EditingNodes>({})
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
  const [apiStatus, setApiStatus] = useState({
    openai: false,
    voicevox: false
  })
  const [availableSpeakers, setAvailableSpeakers] = useState<VoicevoxSpeaker[]>([])
  const [isPreviewingSpeaker, setIsPreviewingSpeaker] = useState(false)
  const [audioFileList, setAudioFileList] = useState<AudioFileInfo[]>([])
  const [showAudioManager, setShowAudioManager] = useState(false)
  const [isLoadingAudioFiles, setIsLoadingAudioFiles] = useState(false)
  
  // グローバル話者設定を使用
  const selectedSpeaker = globalSelectedSpeaker
  const setSelectedSpeaker = onGlobalSpeakerChange || (() => {})

  const openaiService = createOpenAIService()
  const voicevoxService = createVoicevoxService()
  const audioFileDetector = createAudioFileDetector()

  // Check API availability on mount
  useEffect(() => {
    const checkAPIs = async () => {
      try {
        console.log('API初期化開始...');
        
        const openaiAvailable = openaiService.isAvailable();
        const voicevoxAvailable = await voicevoxService.isAvailable();
        
        console.log('API状態:', {
          openai: openaiAvailable,
          voicevox: voicevoxAvailable,
          voicevoxUrl: voicevoxService.voicevoxEngineUrl
        });

        if (voicevoxAvailable) {
          try {
            await voicevoxService.initialize();
            const speakers = voicevoxService.getAvailableSpeakers();
            console.log('利用可能な話者:', speakers);
            setAvailableSpeakers(speakers);
          } catch (error) {
            console.error('VOICEVOX初期化エラー:', error);
            // デフォルトの話者を設定
            setAvailableSpeakers([{
              id: 3,
              name: 'ずんだもん',
              styles: [{
                name: 'ノーマル',
                id: 3
              }]
            }]);
          }
        }

        setApiStatus({
          openai: openaiAvailable,
          voicevox: voicevoxAvailable
        });
      } catch (error) {
        console.error('API初期化エラー:', error);
        setApiStatus({
          openai: false,
          voicevox: false
        });
      }
    };
    
    checkAPIs();
  }, [])

  // 音声ファイル一覧を読み込む
  const loadAudioFiles = async () => {
    setIsLoadingAudioFiles(true)
    try {
      console.log('音声ファイル一覧を読み込み中...')
      const files = await audioFileDetector.getAllAudioFiles(language)
      console.log('読み込み完了:', files)
      setAudioFileList(files)
    } catch (error) {
      console.error('音声ファイル一覧の読み込みに失敗:', error)
    } finally {
      setIsLoadingAudioFiles(false)
    }
  }

  // 音声ファイル管理を表示する際に一覧を読み込み
  useEffect(() => {
    if (showAudioManager) {
      loadAudioFiles()
    }
  }, [showAudioManager, language])

  const getCurrentNodes = (): Record<string, ChatNode> => {
    return flowData.languages[language]?.nodes || {}
  }

  const startEditingNode = (nodeId: string, node: ChatNode) => {
    setEditingNodes(prev => ({
      ...prev,
      [nodeId]: {
        content: node.content,
        editedContent: node.content,
        reading: node.reading || node.content,
        editedReading: node.reading || node.content,
        isGeneratingAudio: false,
        isTranslating: false,
        audioUrl: node.voiceFile || '',
        audioKey: node.voiceFile || ''
      }
    }));
  }

  const updateEditContent = (nodeId: string, content: string, isReading: boolean = false) => {
    setEditingNodes(prev => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        ...(isReading 
          ? { editedReading: content }
          : { editedContent: content }
        )
      }
    }));
  }

  const translateContent = async (nodeId: string) => {
    const editState = editingNodes[nodeId]
    if (!editState || !apiStatus.openai) return

    setEditingNodes(prev => {
      const newMap = { ...prev }
      newMap[nodeId] = { ...editState, isTranslating: true }
      return newMap
    })

    try {
      const targetLang = language === 'ja' ? 'en' : 'ja'
      const translatedText = await openaiService.translateText(
        editState.editedContent,
        targetLang,
        'customer service interactions'
      )

      setEditingNodes(prev => {
        const newMap = { ...prev }
        newMap[nodeId] = { 
          ...editState, 
          translatedContent: translatedText,
          isTranslating: false 
        }
        return newMap
      })
    } catch (error) {
      console.error('Translation failed:', error)
      setEditingNodes(prev => {
        const newMap = { ...prev }
        newMap[nodeId] = { ...editState, isTranslating: false }
        return newMap
      })
    }
  }

  const generateAudio = async (nodeId: string) => {
    if (!apiStatus.voicevox || language !== 'ja') return

    const node = getCurrentNodes()[nodeId]
    if (!node || !node.content.trim()) return

    try {
      console.log(`音声生成開始: ${nodeId}`, {
        content: node.content,
        speaker: selectedSpeaker
      })

      // 生成中状態を設定
      setEditingNodes(prev => ({
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          isGeneratingAudio: true
        }
      }))

      // 音声ファイルを生成して保存
      const audioKey = await generateAndSaveAudio(nodeId, node.content, selectedSpeaker);
      
      if (audioKey) {
        // フローデータを更新
        const updatedFlow = { ...flowData };
        const nodes = updatedFlow.languages[language].nodes;
        if (nodes[nodeId]) {
          nodes[nodeId] = {
            ...nodes[nodeId],
            voiceFile: audioKey
          };
        }
        onFlowUpdate(updatedFlow);

        console.log(`音声生成完了: ${nodeId}`, {
          audioKey,
          content: node.content,
          speaker: selectedSpeaker
        });
      }

      // 編集状態を更新
      setEditingNodes(prev => ({
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          isGeneratingAudio: false
        }
      }));

    } catch (error) {
      console.error(`音声生成エラー (${nodeId}):`, error);
      alert(`音声生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      
      setEditingNodes(prev => ({
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          isGeneratingAudio: false
        }
      }));
    }
  };

  const previewSpeaker = async (speakerId: number) => {
    if (isPreviewingSpeaker) return
    
    setIsPreviewingSpeaker(true)
    try {
      const previewText = 'こんにちは。この話者の音声をプレビューしています。'
      const audioUrl = await voicevoxService.saveAudioFile(previewText, `preview_${speakerId}`, speakerId)
      
      // プレビュー音声を再生
      const audio = new Audio(audioUrl)
      audio.play()
      
      audio.onended = () => {
        setIsPreviewingSpeaker(false)
      }
      
      audio.onerror = () => {
        setIsPreviewingSpeaker(false)
      }
    } catch (error) {
      console.error('Speaker preview failed:', error)
      setIsPreviewingSpeaker(false)
    }
  }

  const saveNodeChanges = async (nodeId: string) => {
    const editState = editingNodes[nodeId]
    if (!editState) return

    // 保存中状態を設定
    setEditingNodes(prev => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        isGeneratingAudio: true
      }
    }))

    const updatedFlow = { ...flowData }
    const nodes = updatedFlow.languages[language].nodes
    
    if (nodes[nodeId]) {
      try {
        let audioKey = nodes[nodeId].voiceFile
        
        // 内容が変更されている場合は音声を再生成
        if (editState.editedContent !== nodes[nodeId].content || 
            editState.editedReading !== (nodes[nodeId].reading || nodes[nodeId].content)) {
          
          console.log('コンテンツまたは読み仮名が変更されました。音声を再生成します。', {
            nodeId,
            oldContent: nodes[nodeId].content,
            newContent: editState.editedContent,
            oldReading: nodes[nodeId].reading,
            newReading: editState.editedReading
          })
          
          // 読み仮名がある場合はそれを使用、なければコンテンツを使用
          const textForAudio = (editState.editedReading || '').trim() || editState.editedContent
          audioKey = await generateAndSaveAudio(nodeId, textForAudio, selectedSpeaker)
        }

        // ノードデータを更新
        nodes[nodeId] = {
          ...nodes[nodeId],
          content: editState.editedContent,
          reading: editState.editedReading,
          voiceFile: audioKey || editState.audioKey || nodes[nodeId].voiceFile
        }
        
        console.log('ノード保存完了:', {
          nodeId,
          content: editState.editedContent,
          reading: editState.editedReading,
          voiceFile: audioKey
        })
        
      } catch (error) {
        console.error('音声生成エラー:', error)
        
        // エラーが発生してもテキストの変更は保存
        nodes[nodeId] = {
          ...nodes[nodeId],
          content: editState.editedContent,
          reading: editState.editedReading
        }
        
        // より詳細なエラーメッセージを表示
        const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました'
        alert(`保存は完了しましたが、音声生成でエラーが発生しました:\n${errorMessage}\n\nテキストの変更は保存されています。`)
      }
    }

    // フローデータを更新
    onFlowUpdate(updatedFlow)
    
    // グローバルキャッシュも更新
    updateCachedFlow(updatedFlow)
    
    // 編集状態を解除
    setEditingNodes(prev => {
      const newMap = { ...prev }
      delete newMap[nodeId]
      return newMap
    })
  }

  const cancelEditing = (nodeId: string) => {
    setEditingNodes(prev => {
      const newMap = { ...prev }
      delete newMap[nodeId]
      return newMap
    })
  }

  const toggleNodeSelection = (nodeId: string) => {
    setSelectedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  const selectAllNodes = () => {
    const nodes = getCurrentNodes()
    setSelectedNodes(new Set(Object.keys(nodes)))
  }

  const clearSelection = () => {
    setSelectedNodes(new Set())
  }

  const generateBatchAudio = async () => {
    if (!apiStatus.voicevox || language !== 'ja' || selectedNodes.size === 0) {
      console.log('一括生成の条件を満たしていません:', {
        voicevoxAvailable: apiStatus.voicevox,
        language,
        selectedCount: selectedNodes.size
      })
      return
    }

    setIsGeneratingBatch(true)
    setBatchProgress({ current: 0, total: selectedNodes.size })

    const nodes = getCurrentNodes()
    const selectedNodeIds = Array.from(selectedNodes)
    let successCount = 0
    let errorCount = 0

    try {
      for (let i = 0; i < selectedNodeIds.length; i++) {
        const nodeId = selectedNodeIds[i]
        const node = nodes[nodeId]
        
        if (node && node.content.trim()) {
          console.log(`一括音声生成中 (${i + 1}/${selectedNodeIds.length}): ${nodeId}`)
          try {
            await generateAudio(nodeId)
            successCount++
          } catch (error) {
            console.error(`ノード ${nodeId} の音声生成に失敗:`, error)
            errorCount++
          }
          setBatchProgress(prev => ({ ...prev, current: i + 1 }))
        }
      }
      
      alert(`一括音声生成完了！\n成功: ${successCount}個\n失敗: ${errorCount}個\n話者: ${getSpeakerName(selectedSpeaker)}`)
      
    } catch (error) {
      console.error('一括音声生成中にエラーが発生:', error)
      alert('一括音声生成中にエラーが発生しました。')
    } finally {
      setIsGeneratingBatch(false)
      setBatchProgress({ current: 0, total: 0 })
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
      11: '玄野武宏（ノーマル）',
      39: '玄野武宏（喜び）',
      40: '玄野武宏（ツンツン）',
      41: '玄野武宏（悲しみ）'
    }
    return speakerMap[speakerId] || `話者ID: ${speakerId}`
  }

  const currentNodes = getCurrentNodes()

  // ノードの編集状態を取得
  const getNodeEditState = (nodeId: string): EditState => {
    return editingNodes[nodeId] || {
      content: currentNodes[nodeId]?.content || '',
      editedContent: currentNodes[nodeId]?.content || '',
      reading: currentNodes[nodeId]?.reading || '',
      editedReading: currentNodes[nodeId]?.reading || '',
      isGeneratingAudio: false,
      isTranslating: false,
      translatedContent: undefined,
      audioUrl: '',
      audioKey: currentNodes[nodeId]?.voiceFile || ''
    }
  }

  console.log(`Available Speakers: `, availableSpeakers);
  console.log(`VOICEVOX Engine URL: ${voicevoxService.voicevoxEngineUrl}`);
  console.log(`VOICEVOX Available: ${apiStatus.voicevox}`);

  // 一括保存機能
  const saveAllChanges = async () => {
    const editedNodeIds = Object.keys(editingNodes);
    if (editedNodeIds.length === 0) {
      alert('編集中のノードがありません');
      return;
    }

    setIsGeneratingBatch(true);
    setBatchProgress({ current: 0, total: editedNodeIds.length });

    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < editedNodeIds.length; i++) {
        const nodeId = editedNodeIds[i];
        setBatchProgress({ current: i + 1, total: editedNodeIds.length });

        try {
          await saveNodeChanges(nodeId);
          successCount++;
        } catch (error) {
          console.error(`ノード ${nodeId} の保存エラー:`, error);
          errorCount++;
        }
      }

      console.log(`一括保存完了: 成功 ${successCount}, 失敗 ${errorCount}`);
      alert(`一括保存が完了しました。\n成功: ${successCount}件\n失敗: ${errorCount}件`);
      
    } catch (error) {
      console.error('一括保存中にエラーが発生:', error);
      alert('一括保存中にエラーが発生しました');
    } finally {
      setIsGeneratingBatch(false);
      setBatchProgress({ current: 0, total: 0 });
    }
  };

  // 全ノードに対して自動音声生成
  const generateAllAudio = async () => {
    if (!apiStatus.voicevox || language !== 'ja') {
      console.log('自動音声生成の条件を満たしていません:', {
        voicevoxAvailable: apiStatus.voicevox,
        language
      })
      return
    }

    const nodes = getCurrentNodes()
    const nodeIds = Object.keys(nodes).filter(nodeId => {
      const node = nodes[nodeId]
      return node && node.content.trim() && !node.voiceFile // 音声ファイルがないノードのみ
    })

    if (nodeIds.length === 0) {
      console.log('音声生成が必要なノードが見つかりません')
      return
    }

    setIsGeneratingBatch(true)
    setBatchProgress({ current: 0, total: nodeIds.length })

    let successCount = 0
    let errorCount = 0

    try {
      for (let i = 0; i < nodeIds.length; i++) {
        const nodeId = nodeIds[i]
        const node = nodes[nodeId]
        
        console.log(`自動音声生成中 (${i + 1}/${nodeIds.length}): ${nodeId}`)
        setBatchProgress({ current: i + 1, total: nodeIds.length })

        try {
          const textForAudio = node.reading?.trim() || node.content
          const audioKey = await generateAndSaveAudio(nodeId, textForAudio, selectedSpeaker)
          
          if (audioKey) {
            // ノードにvoiceFileを設定
            const updatedFlow = {
              ...flowData,
              languages: {
                ...flowData.languages,
                [language]: {
                  ...flowData.languages[language],
                  nodes: {
                    ...flowData.languages[language].nodes,
                    [nodeId]: {
                      ...node,
                      voiceFile: audioKey
                    }
                  }
                }
              }
            }
            
            onFlowUpdate(updatedFlow)
            
            // グローバルキャッシュも更新
            updateCachedFlow(updatedFlow)
            
            successCount++
          }
        } catch (error) {
          console.error(`ノード ${nodeId} の音声生成エラー:`, error)
          errorCount++
        }

        // APIに負荷をかけないよう少し待機
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      console.log(`自動音声生成完了: 成功 ${successCount}, 失敗 ${errorCount}`)
      
      // 音声ファイル一覧を更新
      loadAudioFiles()
      
    } catch (error) {
      console.error('自動音声生成中にエラーが発生:', error)
    } finally {
      setIsGeneratingBatch(false)
      setBatchProgress({ current: 0, total: 0 })
    }
  }

  // 音声の生成と保存
  const generateAndSaveAudio = async (nodeId: string, content: string, speaker: number) => {
    try {
      if (!voicevoxService || !apiStatus.voicevox) {
        throw new Error('VOICEVOXサービスが利用できません');
      }

      const editState = editingNodes[nodeId];
      // 読み仮名があれば、それを音声生成に使用
      const textToSpeak = editState?.editedReading || content;

      console.log('音声生成パラメータ:', {
        nodeId,
        content,
        editedReading: editState?.editedReading,
        textToSpeak,
        speaker,
        textLength: textToSpeak?.length || 0
      });

      if (!textToSpeak || !textToSpeak.trim()) {
        throw new Error('音声生成用のテキストが空です');
      }

      const audioKey = await voicevoxService.saveAudioFile(textToSpeak.trim(), nodeId, speaker);
      if (!audioKey) {
        throw new Error('音声ファイルの保存に失敗しました');
      }

      // 音声ファイルのパスを更新
      const audioUrl = `/audio/ja/${audioKey}`;
      setEditingNodes(prev => ({
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          audioUrl,
          audioKey
        }
      }));

      return audioKey;
    } catch (error) {
      console.error('音声の生成と保存に失敗しました:', error);
      throw error;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          コンテンツ管理
        </h1>
        <p className="text-black">
          {language === 'ja' ? '日本語' : '英語'}のチャットコンテンツを編集し、音声ファイルを生成します
        </p>
        
        {/* API Status */}
        <div className="flex gap-4 mt-4">
          <div className={`px-3 py-1 rounded-full text-sm ${
            apiStatus.openai 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            OpenAI: {apiStatus.openai ? '接続済み' : '未接続'}
          </div>
          <div className={`px-3 py-1 rounded-full text-sm ${
            apiStatus.voicevox 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            VOICEVOX: {apiStatus.voicevox ? '利用可能' : '利用不可'}
          </div>
        </div>

        {/* Speaker Selection */}
        {language === 'ja' && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">音声話者選択</h3>
            <div className="mb-4">
              <p className="text-sm text-black">
                VOICEVOX状態: {apiStatus.voicevox ? '接続済み' : '未接続'}
              </p>
              <p className="text-sm text-black">
                利用可能な話者: {availableSpeakers.length}名
              </p>
            </div>
            {availableSpeakers.length > 0 ? (
              <SpeakerSelector
                selectedSpeaker={selectedSpeaker}
                onSpeakerChange={setSelectedSpeaker}
                speakers={availableSpeakers}
                onPreview={previewSpeaker}
                className="max-w-md"
              />
            ) : (
              <p className="text-sm text-black">
                話者情報を読み込み中...
              </p>
            )}
            {isPreviewingSpeaker && (
              <div className="mt-2 text-sm text-blue-600">
                🔊 話者音声をプレビュー中...
              </div>
            )}
            
            {/* Auto Audio Generation */}
            {apiStatus.voicevox && availableSpeakers.length > 0 && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <button
                  onClick={generateAllAudio}
                  disabled={isGeneratingBatch}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                    isGeneratingBatch
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isGeneratingBatch ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      全ノード音声生成中... ({batchProgress.current}/{batchProgress.total})
                    </div>
                  ) : (
                    '🔊 全ノード自動音声生成'
                  )}
                </button>
                <p className="text-xs text-gray-600 mt-2 text-center">
                  音声ファイルが未生成のノードに対して自動で音声を生成します
                </p>
              </div>
            )}
          </div>
        )}

        {/* 一括保存ボタン */}
        {Object.keys(editingNodes).length > 0 && (
          <div className="mt-4">
            <button
              onClick={saveAllChanges}
              disabled={isGeneratingBatch}
              className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                isGeneratingBatch
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
            >
              {isGeneratingBatch ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  一括保存中... ({batchProgress.current}/{batchProgress.total})
                </div>
              ) : (
                `💾 全て保存 (${Object.keys(editingNodes).length}件の編集中)`
              )}
            </button>
            <p className="text-xs text-gray-600 mt-2 text-center">
              編集中の全ノードを一括で保存します
            </p>
          </div>
        )}

        {/* 音声ファイル管理ボタン */}
        <div className="mt-4">
          <button
            onClick={() => setShowAudioManager(!showAudioManager)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            {showAudioManager ? '音声ファイル管理を閉じる' : '音声ファイル管理を開く'}
          </button>
        </div>
      </div>

      {/* 音声ファイル管理セクション */}
      {showAudioManager && (
        <div className="mb-6 bg-purple-50 border border-purple-200 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-1v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-1c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-1" />
              </svg>
              音声ファイル管理
            </h3>
            <button
              onClick={loadAudioFiles}
              disabled={isLoadingAudioFiles}
              className={`px-4 py-2 rounded-lg font-medium transition-colors shadow-sm ${
                isLoadingAudioFiles
                  ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isLoadingAudioFiles ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  読み込み中...
                </div>
              ) : (
                '更新'
              )}
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-black">
              {language === 'ja' ? '日本語' : '英語'}の音声ファイル: {audioFileList.length}個
            </p>
          </div>

          {isLoadingAudioFiles ? (
            <div className="text-center py-8">
              <div className="flex items-center justify-center gap-2 text-purple-600">
                <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-black">音声ファイルを検索中...</span>
              </div>
            </div>
          ) : audioFileList.length > 0 ? (
            <div className="grid gap-3">
              {audioFileList.map((file, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-black">
                        ノード: <span className="text-purple-600">{file.nodeId}</span>
                      </p>
                      <p className="text-sm text-black">
                        話者: {file.speaker === 'none' ? 'なし' : `ID ${file.speaker}`}
                      </p>
                      <p className="text-xs text-black">
                        ファイル: {file.filename}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <audio controls className="h-8">
                        <source src={file.url} type="audio/wav" />
                      </audio>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-black">音声ファイルがありません</p>
              <p className="text-sm text-black mt-1">コンテンツ編集で音声を生成してください</p>
              <button
                onClick={loadAudioFiles}
                className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                手動で再検索
              </button>
            </div>
          )}
        </div>
      )}

      {/* 一括操作セクション */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            一括操作
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={selectAllNodes}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              全選択
            </button>
            <button
              onClick={clearSelection}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              選択解除
            </button>
            <button
              onClick={generateBatchAudio}
              disabled={!apiStatus.voicevox || language !== 'ja' || selectedNodes.size === 0 || isGeneratingBatch}
              className={`px-6 py-2 rounded-lg font-medium transition-colors shadow-sm ${
                !apiStatus.voicevox || language !== 'ja' || selectedNodes.size === 0 || isGeneratingBatch
                  ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isGeneratingBatch ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  生成中...
                </div>
              ) : (
                `選択した音声を一括生成 (${selectedNodes.size}件)`
              )}
            </button>
          </div>
        </div>
        
        {isGeneratingBatch && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{
                  width: `${(batchProgress.current / batchProgress.total) * 100}%`
                }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {batchProgress.current} / {batchProgress.total} ノードを生成中
            </p>
          </div>
        )}
      </div>

      {/* Node List */}
      <div className="space-y-4">
        {Object.entries(currentNodes).map(([nodeId, node]) => {
          const editState = getNodeEditState(nodeId)
          const isEditing = nodeId in editingNodes
          const isSelected = selectedNodes.has(nodeId)

          return (
            <div
              key={nodeId}
              className={`border-2 rounded-xl p-6 transition-all duration-200 ${
                isSelected 
                  ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 shadow-md' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleNodeSelection(nodeId)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">{nodeId}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      node.type === 'message' ? 'bg-green-100 text-green-800' :
                      node.type === 'choice' ? 'bg-blue-100 text-blue-800' :
                      node.type === 'input' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {node.type}
                    </span>
                  </div>
                </div>
                
                {/* Node Actions */}
                <div className="flex items-center gap-2">
                  {editState.isGeneratingAudio ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-md">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      保存中...
                    </div>
                  ) : (
                    <>
                      {!isEditing ? (
                        <button
                          onClick={() => startEditingNode(nodeId, node)}
                          className="px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md border border-blue-200 hover:border-blue-300 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          aria-label="編集"
                          title="編集"
                        >
                          編集
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveNodeChanges(nodeId)}
                            className="px-3 py-2 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded-md border border-green-200 hover:border-green-300 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                            aria-label="保存"
                            title="保存"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => cancelEditing(nodeId)}
                            className="px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-md border border-gray-200 hover:border-gray-300 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                            aria-label="キャンセル"
                            title="キャンセル"
                          >
                            キャンセル
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Content Display/Edit */}
              {!isEditing ? (
                <div className="space-y-2 mb-3">
                  <div className="text-black">
                    <strong>内容:</strong> {node.content}
                  </div>
                  {node.reading && (
                    <div className="text-black text-sm">
                      <strong>読み:</strong> {node.reading}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      内容
                    </label>
                    <textarea
                      value={editState.editedContent}
                      onChange={(e) => updateEditContent(nodeId, e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md resize-none text-black bg-white"
                      rows={3}
                      placeholder="コンテンツを入力..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      読み仮名 (音声生成用)
                    </label>
                    <textarea
                      value={editState.editedReading}
                      onChange={(e) => updateEditContent(nodeId, e.target.value, true)}
                      className="w-full p-3 border border-gray-300 rounded-md resize-none text-black bg-white"
                      rows={2}
                      placeholder="ひらがなで読み方を入力... (例: こんにちは)"
                    />
                    <p className="text-xs text-black mt-1">
                      ここに入力された読み仮名が音声生成に使用されます。空の場合は内容がそのまま使用されます。
                    </p>
                  </div>
                  
                  {/* Translation Section */}
                  {apiStatus.openai && (
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700">
                          Translation ({language === 'ja' ? 'English' : 'Japanese'})
                        </h4>
                        <button
                          onClick={() => translateContent(nodeId)}
                          disabled={editState.isTranslating}
                          className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded disabled:opacity-50"
                        >
                          {editState.isTranslating ? 'Translating...' : 'Translate'}
                        </button>
                      </div>
                      {editState.translatedContent && (
                        <div className="p-2 bg-gray-50 rounded text-sm text-gray-600">
                          {editState.translatedContent}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Audio Management Section */}
                  {language === 'ja' && (
                    <div className="border-t pt-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        音声管理
                      </h4>
                      
                      {/* Existing Audio Selection */}
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          既存音声ファイルを選択
                        </label>
                        <select
                          value={editState.audioKey || ''}
                          onChange={(e) => {
                            const selectedAudioKey = e.target.value;
                            setEditingNodes(prev => ({
                              ...prev,
                              [nodeId]: {
                                ...prev[nodeId],
                                audioKey: selectedAudioKey,
                                audioUrl: selectedAudioKey ? `/audio/ja/${selectedAudioKey}.wav` : ''
                              }
                            }));
                          }}
                          className="w-full p-2 text-xs border border-gray-300 rounded text-black bg-white"
                        >
                          <option value="">音声ファイルを選択...</option>
                          {audioFileList.map((file, index) => (
                            <option key={index} value={file.nodeId + '_' + file.speaker}>
                              {file.nodeId} (話者: {file.speaker === 'none' ? 'なし' : file.speaker})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Audio Generation */}
                      {apiStatus.voicevox && availableSpeakers.length > 0 && (
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-600">新規音声生成</span>
                          <button
                            onClick={() => generateAudio(nodeId)}
                            disabled={editState.isGeneratingAudio}
                            className="px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 text-purple-800 rounded disabled:opacity-50"
                          >
                            {editState.isGeneratingAudio ? '生成中...' : '音声生成'}
                          </button>
                        </div>
                      )}

                      {/* Audio Preview */}
                      {editState.audioUrl && (
                        <audio controls className="w-full">
                          <source src={editState.audioUrl} type="audio/wav" />
                          Your browser does not support the audio element.
                        </audio>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Voice File Info */}
              {node.voiceFile && (
                <div className="text-xs text-black">
                  Audio Key: {node.voiceFile}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}