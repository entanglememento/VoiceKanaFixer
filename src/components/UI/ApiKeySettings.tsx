'use client'

import { useState, useEffect } from 'react'
import { ApiKeyManager, TranslationService } from '@/services/translationService'

interface ApiKeySettingsProps {
  isOpen: boolean
  onClose: () => void
  onApiKeySet: (apiKey: string) => void
  language: 'ja' | 'en'
}

export default function ApiKeySettings({ 
  isOpen, 
  onClose, 
  onApiKeySet, 
  language 
}: ApiKeySettingsProps) {
  const [apiKey, setApiKey] = useState('')
  const [isTestingKey, setIsTestingKey] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const savedKey = ApiKeyManager.getApiKey()
    if (savedKey) {
      setApiKey(savedKey)
    }
  }, [])

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) {
      setErrorMessage(language === 'ja' ? 'APIキーを入力してください' : 'Please enter API key')
      return
    }

    setIsTestingKey(true)
    setTestResult(null)
    setErrorMessage('')

    try {
      const translationService = new TranslationService()
      const isValid = await translationService.testApiKey()
      
      if (isValid) {
        setTestResult('success')
        ApiKeyManager.saveApiKey()
        onApiKeySet(apiKey)
      } else {
        setTestResult('error')
        setErrorMessage(language === 'ja' ? 'APIキーが無効です' : 'Invalid API key')
      }
    } catch {
      setTestResult('error')
      setErrorMessage(language === 'ja' ? 'テスト中にエラーが発生しました' : 'Error occurred during testing')
    } finally {
      setIsTestingKey(false)
    }
  }

  const handleSave = () => {
    if (testResult === 'success') {
      onClose()
    } else {
      handleTestApiKey()
    }
  }

  const handleRemoveKey = () => {
    ApiKeyManager.removeApiKey()
    setApiKey('')
    setTestResult(null)
    setErrorMessage('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
          {language === 'ja' ? 'OpenAI API設定' : 'OpenAI API Settings'}
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            {language === 'ja' ? 'APIキー' : 'API Key'}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={language === 'ja' ? 'sk-...' : 'sk-...'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            {language === 'ja' 
              ? 'OpenAI APIキーを入力してください。ローカルストレージに保存されます。'
              : 'Enter your OpenAI API key. It will be stored in local storage.'
            }
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {errorMessage}
          </div>
        )}

        {testResult === 'success' && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {language === 'ja' ? 'APIキーが正常に動作しています' : 'API key is working correctly'}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleTestApiKey}
            disabled={isTestingKey || !apiKey.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTestingKey 
              ? (language === 'ja' ? 'テスト中...' : 'Testing...')
              : (language === 'ja' ? 'テスト' : 'Test')
            }
          </button>

          <button
            onClick={handleSave}
            disabled={isTestingKey}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            {language === 'ja' ? '保存' : 'Save'}
          </button>

          {ApiKeyManager.hasApiKey() && (
            <button
              onClick={handleRemoveKey}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              {language === 'ja' ? '削除' : 'Remove'}
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            {language === 'ja' ? 'キャンセル' : 'Cancel'}
          </button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {language === 'ja' 
              ? 'APIキーはOpenAIの公式サイトで取得できます。翻訳機能を使用する際のみ課金されます。'
              : 'You can get your API key from OpenAI official website. You will only be charged when using translation features.'
            }
          </p>
        </div>
      </div>
    </div>
  )
}