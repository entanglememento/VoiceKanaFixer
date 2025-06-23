'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Language, OptimizedChatFlow } from '@/types'
import { getRealBankingFlowFromConfiguration } from '@/utils/realBankingFlowConverter'
import ContentManager from '@/components/Management/ContentManager'
import ContentPreview from '@/components/Management/ContentPreview'

type ManagementTab = 'preview' | 'edit' | 'settings'

export default function ManagementPage() {
  const [flowData, setFlowData] = useState<OptimizedChatFlow | null>(null)
  const [language, setLanguage] = useState<Language>('ja')
  const [activeTab, setActiveTab] = useState<ManagementTab>('preview')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSpeaker, setSelectedSpeaker] = useState(3) // グローバル話者設定

  // Load flow data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const data = await getRealBankingFlowFromConfiguration()
        setFlowData(data)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load flow data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const handleFlowUpdate = (updatedFlow: OptimizedChatFlow) => {
    setFlowData(updatedFlow)
    // In a real application, you would save this to the server
    console.log('Flow updated:', updatedFlow)
  }

  const downloadFlowData = () => {
    if (!flowData) return
    
    const dataStr = JSON.stringify(flowData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `chatflow_${flowData.storeName}_${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const uploadFlowData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const parsedData = JSON.parse(content) as OptimizedChatFlow
        setFlowData(parsedData)
      } catch {
        setError('Invalid JSON file format')
      }
    }
    reader.readAsText(file)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading management interface...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!flowData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600">No flow data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 sm:h-16 gap-4 sm:gap-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                コンテンツ管理システム
              </h1>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {flowData.storeName}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              {/* Language Selector */}
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="ja">日本語</option>
                <option value="en">English</option>
              </select>

              {/* File Operations */}
              <div className="flex flex-wrap gap-2">
                <label className="px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded cursor-pointer text-sm whitespace-nowrap">
                  JSONアップロード
                  <input
                    type="file"
                    accept=".json"
                    onChange={uploadFlowData}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={downloadFlowData}
                  className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm whitespace-nowrap"
                >
                  JSONダウンロード
                </button>
              </div>

              {/* Back to App */}
              <Link
                href="/"
                className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm whitespace-nowrap"
              >
                アプリに戻る
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 sm:space-x-8 min-w-max">
            {[
              { id: 'preview', label: 'コンテンツプレビュー', icon: '👁️' },
              { id: 'edit', label: 'コンテンツ編集', icon: '✏️' },
              { id: 'settings', label: '設定', icon: '⚙️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ManagementTab)}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content Area */}
      <main className="max-w-7xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
        {activeTab === 'preview' && (
          <ContentPreview
            flowData={flowData}
            language={language}
            selectedSpeaker={selectedSpeaker}
            onSpeakerChange={setSelectedSpeaker}
          />
        )}

        {activeTab === 'edit' && (
          <ContentManager
            flowData={flowData}
            onFlowUpdate={handleFlowUpdate}
            language={language}
            selectedSpeaker={selectedSpeaker}
            onSpeakerChange={setSelectedSpeaker}
          />
        )}

        {activeTab === 'settings' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">設定</h2>
            
            {/* Store Information */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">店舗情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    店舗名
                  </label>
                  <input
                    type="text"
                    value={flowData.storeName}
                    onChange={(e) => setFlowData({
                      ...flowData,
                      storeName: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    バージョン
                  </label>
                  <input
                    type="text"
                    value={flowData.version}
                    onChange={(e) => setFlowData({
                      ...flowData,
                      version: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* Language Settings */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Language Settings</h3>
              {Object.entries(flowData.languages).map(([lang, config]) => (
                <div key={lang} className="mb-4 p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">
                    {lang === 'ja' ? 'Japanese' : 'English'} Settings
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Auto Stop (seconds)
                      </label>
                      <input
                        type="number"
                        value={config.settings.autoStopSeconds}
                        onChange={(e) => {
                          const updatedFlow = { ...flowData }
                          updatedFlow.languages[lang as Language].settings.autoStopSeconds = Number(e.target.value)
                          setFlowData(updatedFlow)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Voice Speed
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={config.settings.voiceSpeed}
                        onChange={(e) => {
                          const updatedFlow = { ...flowData }
                          updatedFlow.languages[lang as Language].settings.voiceSpeed = Number(e.target.value)
                          setFlowData(updatedFlow)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        QR Password
                      </label>
                      <input
                        type="text"
                        value={config.settings.qrPassword}
                        onChange={(e) => {
                          const updatedFlow = { ...flowData }
                          updatedFlow.languages[lang as Language].settings.qrPassword = e.target.value
                          setFlowData(updatedFlow)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        QR Expiry (minutes)
                      </label>
                      <input
                        type="number"
                        value={config.settings.qrExpiryMinutes}
                        onChange={(e) => {
                          const updatedFlow = { ...flowData }
                          updatedFlow.languages[lang as Language].settings.qrExpiryMinutes = Number(e.target.value)
                          setFlowData(updatedFlow)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* API Configuration */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">API Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    OpenAI API Key
                  </label>
                  <input
                    type="password"
                    placeholder="sk-..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used for translation and text optimization
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    VOICEVOX Server URL
                  </label>
                  <input
                    type="url"
                    placeholder="http://localhost:50021"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    VOICEVOX server for Japanese voice generation
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}