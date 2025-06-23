'use client'

import { useState } from 'react'
import { VoicevoxSpeaker } from '@/types'
import { VOICEVOX_SPEAKERS } from '@/services/voicevoxService'

interface SpeakerSelectorProps {
  selectedSpeaker: number
  onSpeakerChange: (speakerId: number) => void
  speakers: VoicevoxSpeaker[]
  onPreview?: (speakerId: number) => void
  className?: string
}

export default function SpeakerSelector({
  selectedSpeaker,
  onSpeakerChange,
  speakers,
  onPreview,
  className = ''
}: SpeakerSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getSelectedSpeakerInfo = () => {
    for (const speaker of speakers) {
      const style = speaker.styles.find(s => s.id === selectedSpeaker)
      if (style) {
        return { speaker: speaker.name, style: style.name, id: style.id }
      }
    }
    return { speaker: 'ずんだもん', style: 'ノーマル', id: 3 }
  }

  const selectedInfo = getSelectedSpeakerInfo()

  return (
    <div className={`relative ${className}`}>
      {/* 現在選択中の話者表示 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg flex items-center justify-between hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
            {selectedInfo.speaker.charAt(0)}
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-900">{selectedInfo.speaker}</div>
            <div className="text-sm text-gray-500">{selectedInfo.style}</div>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 話者選択ドロップダウン */}
      {isExpanded && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto z-50">
          {speakers.map((speaker) => (
            <div key={speaker.id} className="border-b border-gray-100 last:border-b-0">
              <div className="px-4 py-2 bg-gray-50">
                <h4 className="font-medium text-gray-900">{speaker.name}</h4>
              </div>
              {speaker.styles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => {
                    onSpeakerChange(style.id)
                    setIsExpanded(false)
                  }}
                  className={`w-full px-6 py-3 text-left hover:bg-blue-50 flex items-center justify-between group ${
                    selectedSpeaker === style.id ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      selectedSpeaker === style.id ? 'bg-blue-500' : 'bg-gray-300'
                    }`} />
                    <span className="font-medium">{style.name}</span>
                    <span className="text-xs text-gray-500">ID: {style.id}</span>
                  </div>
                  
                  {/* プレビューボタン */}
                  {onPreview && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onPreview(style.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-opacity"
                    >
                      プレビュー
                    </button>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* 推奨話者クイック選択 */}
      <div className="mt-3">
        <div className="text-xs text-gray-600 mb-2">よく使われる話者:</div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: VOICEVOX_SPEAKERS.ZUNDAMON_NORMAL, label: 'ずんだもん' },
            { id: VOICEVOX_SPEAKERS.METAN_NORMAL, label: 'めたん' },
            { id: VOICEVOX_SPEAKERS.TSUMUGI, label: 'つむぎ' },
            { id: VOICEVOX_SPEAKERS.TAKEHIRO_NORMAL, label: '武宏' }
          ].map((quickSpeaker) => (
            <button
              key={quickSpeaker.id}
              onClick={() => onSpeakerChange(quickSpeaker.id)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                selectedSpeaker === quickSpeaker.id
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
              }`}
            >
              {quickSpeaker.label}
            </button>
          ))}
        </div>
      </div>

      {/* 選択中話者の詳細情報 */}
      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-600 mb-1">選択中の話者詳細:</div>
        <div className="text-sm">
          <span className="font-medium">{selectedInfo.speaker}</span>
          <span className="text-gray-500"> - {selectedInfo.style}</span>
          <span className="text-gray-400"> (ID: {selectedInfo.id})</span>
        </div>
        
        {/* 話者特性の説明 */}
        <div className="mt-2 text-xs text-gray-600">
          {getSpeakerDescription(selectedSpeaker)}
        </div>
      </div>
    </div>
  )
}

// 話者の特性説明を取得
function getSpeakerDescription(speakerId: number): string {
  switch (speakerId) {
    case 0:
      return '四国めたんの甘えた声。可愛らしく親しみやすい印象を与えます。'
    case 1:
      return 'ずんだもんの甘えた声。優しく温かみのある話し方です。'
    case 2:
      return '四国めたんの標準的な声。バランスの取れた自然な話し方です。'
    case 3:
      return 'ずんだもんの標準的な声。明るく親しみやすい声質です。'
    case 4:
      return '四国めたんのセクシーな声。落ち着いた大人の印象を与えます。'
    case 5:
      return 'ずんだもんのセクシーな声。低めの声で魅力的な話し方です。'
    case 6:
      return '四国めたんのツンツンした声。元気でハキハキとした話し方です。'
    case 7:
      return 'ずんだもんのツンツンした声。快活で活発な印象を与えます。'
    case 8:
      return '春日部つむぎの標準的な声。穏やかで品のある話し方です。'
    case 9:
      return '波音リツの標準的な声。クールで知的な印象を与えます。'
    case 10:
      return '雨晴はうの標準的な声。明るく元気な話し方です。'
    case 11:
      return '玄野武宏の標準的な声。男性らしい落ち着いた声質です。'
    case 39:
      return '玄野武宏の喜びの声。明るく楽しい雰囲気を演出します。'
    case 40:
      return '玄野武宏のツンツンした声。きびきびとした話し方です。'
    case 41:
      return '玄野武宏の悲しい声。しっとりとした感情的な表現です。'
    default:
      return '標準的な音声設定です。'
  }
}

// 話者プリセット
export const SPEAKER_PRESETS = {
  GENTLE: {
    name: '優しい接客',
    speakerId: VOICEVOX_SPEAKERS.METAN_SWEET,
    description: '親しみやすく温かい接客に最適'
  },
  PROFESSIONAL: {
    name: 'プロフェッショナル',
    speakerId: VOICEVOX_SPEAKERS.TSUMUGI,
    description: '丁寧で品のある接客に最適'
  },
  ENERGETIC: {
    name: '元気・活発',
    speakerId: VOICEVOX_SPEAKERS.ZUNDAMON_NORMAL,
    description: '明るく活発な接客に最適'
  },
  CALM: {
    name: '落ち着いた',
    speakerId: VOICEVOX_SPEAKERS.TAKEHIRO_NORMAL,
    description: '安定感のある男性声で信頼性を演出'
  }
} as const