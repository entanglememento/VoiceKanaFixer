# API 仕様書

## 📡 API エンドポイント一覧

### 概要
このドキュメントでは、AIチャットボットアプリケーションで使用されるすべてのAPI エンドポイントの詳細仕様を説明します。

## 🔄 設定変換 API

### POST /api/convert-json

**目的**: 銀行業務設定をチャットボット用最適化フローに変換

#### リクエスト
```http
POST /api/convert-json
Content-Type: application/json

{
  "originalConfiguration": {
    "storeName": "銀行ATMサービス",
    "version": "1.0",
    "workflows": {
      "deposit": {
        "name": "預入",
        "steps": ["金額入力", "確認", "処理"],
        "validations": {
          "maxAmount": 200000
        }
      }
    },
    "codeDefinitions": {
      "countries": [
        {"code": "JP", "name": "日本"},
        {"code": "US", "name": "アメリカ"}
      ]
    }
  }
}
```

#### レスポンス
```json
{
  "success": true,
  "data": {
    "version": "1.0",
    "storeName": "銀行ATMサービス",
    "languages": {
      "ja": {
        "languageSelection": true,
        "settings": {
          "autoStopSeconds": 3,
          "voiceSpeed": 1.0,
          "qrPassword": "1234",
          "qrExpiryMinutes": 30
        },
        "nodes": {
          "start": {
            "id": "start",
            "type": "message",
            "content": "いらっしゃいませ。ご用件をお聞かせください。",
            "next": "transaction_type",
            "voiceFile": "welcome_3"
          }
        }
      }
    }
  },
  "tokensUsed": 1250,
  "cost": 0.0025
}
```

#### エラーレスポンス
```json
{
  "success": false,
  "error": "Invalid configuration format",
  "details": "Required field 'storeName' is missing"
}
```

---

## 🎵 音声ファイル管理 API

### POST /api/save-audio

**目的**: VOICEVOX生成音声ファイルの保存

#### リクエスト
```http
POST /api/save-audio
Content-Type: application/json

{
  "text": "いらっしゃいませ。ご用件をお聞かせください。",
  "audioKey": "welcome_3",
  "speaker": 3,
  "language": "ja"
}
```

#### レスポンス
```json
{
  "success": true,
  "audioUrl": "/audio/ja/welcome_3.wav",
  "fileSize": 245760,
  "duration": 3.2,
  "speaker": 3
}
```

### GET /api/audio-files

**目的**: 利用可能な音声ファイル一覧の取得

#### リクエスト
```http
GET /api/audio-files?language=ja&speaker=3
```

#### レスポンス
```json
{
  "success": true,
  "files": [
    {
      "audioKey": "welcome_3",
      "filePath": "/audio/ja/welcome_3.wav",
      "speaker": 3,
      "fileSize": 245760,
      "lastModified": "2024-01-15T10:30:00Z"
    },
    {
      "audioKey": "deposit_amount_3",
      "filePath": "/audio/ja/deposit_amount_3.wav",
      "speaker": 3,
      "fileSize": 180320,
      "lastModified": "2024-01-15T10:32:00Z"
    }
  ],
  "total": 2
}
```

---

## 🌐 翻訳 API

### POST /api/translate

**目的**: 汎用翻訳サービス

#### リクエスト
```http
POST /api/translate
Content-Type: application/json

{
  "text": "預入金額を入力してください",
  "sourceLanguage": "ja",
  "targetLanguage": "en",
  "context": "banking_customer_service"
}
```

#### レスポンス
```json
{
  "success": true,
  "translatedText": "Please enter the deposit amount",
  "sourceLanguage": "ja",
  "targetLanguage": "en",
  "confidence": 0.95
}
```

### POST /api/openai/translate

**目的**: OpenAI powered 高品質翻訳

#### リクエスト
```http
POST /api/openai/translate
Content-Type: application/json

{
  "content": {
    "welcome": "いらっしゃいませ",
    "deposit": "預入金額を入力してください",
    "confirmation": "こちらの内容でよろしいですか？"
  },
  "targetLanguage": "en",
  "context": "polite_banking_service",
  "preserveKeys": true
}
```

#### レスポンス
```json
{
  "success": true,
  "translatedContent": {
    "welcome": "Welcome to our service",
    "deposit": "Please enter the deposit amount",
    "confirmation": "Is this information correct?"
  },
  "tokensUsed": 450,
  "cost": 0.0009
}
```

---

## 🤖 OpenAI 統合 API

### POST /api/openai/convert

**目的**: 設定のインテリジェント変換

#### リクエスト
```http
POST /api/openai/convert
Content-Type: application/json

{
  "originalConfiguration": {
    "workflows": {
      "deposit": {
        "steps": ["amount_input", "confirmation", "processing"],
        "validations": {
          "maxAmount": 200000,
          "currency": "JPY"
        }
      }
    }
  },
  "targetFormat": "chatbot_flow",
  "language": "ja",
  "optimizations": ["voice_friendly", "error_handling", "accessibility"]
}
```

#### レスポンス
```json
{
  "success": true,
  "convertedFlow": {
    "nodes": {
      "deposit_amount": {
        "id": "deposit_amount",
        "type": "input",
        "content": "預入金額をお教えください。",
        "reading": "よにゅうきんがくをおしえてください",
        "field": "depositAmount",
        "validation": {
          "type": "number",
          "min": 1000,
          "max": 200000,
          "step": 1000
        },
        "next": "deposit_confirmation",
        "voiceFile": "deposit_amount_3"
      }
    }
  },
  "optimizations": [
    "Added voice-friendly readings",
    "Included error handling for invalid amounts",
    "Enhanced accessibility with clear instructions"
  ],
  "tokensUsed": 1800,
  "cost": 0.0036
}
```

---

## 📊 システム情報 API

### GET /api/system/health

**目的**: システムヘルスチェック

#### レスポンス
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "openai": {
      "status": "connected",
      "lastCheck": "2024-01-15T10:29:45Z",
      "responseTime": 245
    },
    "voicevox": {
      "status": "available",
      "endpoint": "http://localhost:50021",
      "version": "0.14.0"
    },
    "vosk": {
      "status": "loaded",
      "models": ["ja", "en"],
      "memoryUsage": "150MB"
    }
  },
  "performance": {
    "avgResponseTime": 180,
    "requestsPerMinute": 45,
    "errorRate": 0.02
  }
}
```

### GET /api/system/config

**目的**: 現在のシステム設定取得

#### レスポンス
```json
{
  "version": "1.0.0",
  "features": {
    "voiceRecognition": true,
    "voiceOutput": true,
    "multiLanguage": true,
    "aiTranslation": true,
    "offlineMode": true
  },
  "settings": {
    "defaultLanguage": "ja",
    "autoStopSeconds": 3,
    "maxFileSize": "10MB",
    "supportedFormats": ["wav", "mp3"],
    "voiceSpeakers": [2, 3, 11, 22]
  },
  "limits": {
    "maxRequestsPerMinute": 100,
    "maxTokensPerRequest": 2000,
    "maxAudioDuration": 30
  }
}
```

---

## 🔍 デバッグ・ログ API

### GET /api/debug/logs

**目的**: デバッグログの取得

#### クエリパラメータ
- `level`: ログレベル (error, warn, info, debug)
- `since`: 開始時刻 (ISO 8601)
- `limit`: 最大件数 (default: 100)

#### リクエスト
```http
GET /api/debug/logs?level=error&since=2024-01-15T10:00:00Z&limit=50
```

#### レスポンス
```json
{
  "logs": [
    {
      "timestamp": "2024-01-15T10:25:30Z",
      "level": "error",
      "message": "Voice recognition failed",
      "context": {
        "userId": "anonymous",
        "language": "ja",
        "errorCode": "VOSK_INIT_FAILED"
      },
      "stack": "Error at VoiceRecognitionService.initializeVosk..."
    }
  ],
  "total": 3,
  "hasMore": false
}
```

### POST /api/debug/test-voice

**目的**: 音声機能のテスト

#### リクエスト
```http
POST /api/debug/test-voice
Content-Type: application/json

{
  "text": "テスト音声です",
  "speaker": 3,
  "language": "ja"
}
```

#### レスポンス
```json
{
  "success": true,
  "testResults": {
    "voicevoxConnected": true,
    "audioGenerated": true,
    "fileSize": 84320,
    "duration": 1.8,
    "quality": "good"
  },
  "audioUrl": "/api/debug/test-audio/temp_123.wav"
}
```

---

## 🛡️ セキュリティ仕様

### 認証
- APIキーベース認証（OpenAI関連エンドポイント）
- セッションベース認証（管理機能）

### レート制限
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1642248000
```

### CORS設定
```javascript
{
  "origin": ["https://yourdomain.com", "http://localhost:3000"],
  "methods": ["GET", "POST", "PUT", "DELETE"],
  "allowedHeaders": ["Content-Type", "Authorization"],
  "credentials": true
}
```

---

## 📋 エラーコード一覧

| コード | 説明 | 対処法 |
|--------|------|---------|
| 1001 | Invalid API key | APIキーを確認してください |
| 1002 | Rate limit exceeded | しばらく待ってから再試行 |
| 2001 | Invalid audio format | サポートされている形式を使用 |
| 2002 | Audio file too large | ファイルサイズを縮小 |
| 3001 | Translation failed | テキストの内容を確認 |
| 3002 | Unsupported language | サポート言語を確認 |
| 4001 | Configuration invalid | 設定ファイルの形式を確認 |
| 4002 | Flow conversion failed | 設定内容を見直し |
| 5001 | VOICEVOX unavailable | VOICEVOXサーバーを確認 |
| 5002 | Voice model not found | 音声モデルを確認 |

---

## 🔧 開発者向け情報

### SDKサンプル（JavaScript）

```javascript
class ChatbotAPI {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }
  
  async convertConfiguration(config) {
    const response = await fetch(`${this.baseUrl}/api/convert-json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ originalConfiguration: config })
    })
    
    return await response.json()
  }
  
  async saveAudioFile(text, audioKey, speaker = 3) {
    const response = await fetch(`${this.baseUrl}/api/save-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text, audioKey, speaker })
    })
    
    return await response.json()
  }
}

// 使用例
const api = new ChatbotAPI('https://your-app.vercel.app', 'your-api-key')

const result = await api.convertConfiguration({
  storeName: "テスト銀行",
  workflows: { /* ... */ }
})

console.log(result.data.languages.ja.nodes)
```

### Webhookサポート（将来実装予定）

```javascript
// Webhook URL: /api/webhooks/flow-update
{
  "event": "flow_updated",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "flowId": "main_flow",
    "version": "1.1",
    "changes": ["Added new transaction type", "Updated voice files"]
  }
}
```

このAPI仕様書により、開発者は効率的にシステムと連携し、機能を拡張できます。