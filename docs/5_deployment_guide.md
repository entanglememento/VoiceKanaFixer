# デプロイメント・運用ガイド

## 🚀 デプロイメント概要

このガイドでは、AIチャットボットアプリケーションの本番環境への展開と運用について詳しく説明します。

## 📋 前提条件

### システム要件
- **Node.js**: 18.17.0 以上
- **npm**: 9.0.0 以上
- **メモリ**: 最低 2GB、推奨 4GB
- **ストレージ**: 最低 5GB（音声ファイル含む）

### 必要なアカウント・サービス
- **Vercel アカウント** (推奨) または他のホスティングサービス
- **OpenAI API キー**
- **GitHub アカウント** (CI/CD用)
- **VOICEVOX サーバー** (オプション)

## 🔧 環境設定

### 1. 環境変数の設定

#### 本番環境 (.env.production)
```bash
# OpenAI 設定
OPENAI_API_KEY=sk-your-production-openai-api-key
NEXT_PUBLIC_OPENAI_API_KEY=sk-your-production-openai-api-key

# アプリケーション設定
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-super-secret-nextauth-secret

# VOICEVOX 設定（オプション）
VOICEVOX_SERVER_URL=https://your-voicevox-server.com
NEXT_PUBLIC_VOICEVOX_SERVER_URL=https://your-voicevox-server.com

# 監視・ログ設定
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

#### 開発環境 (.env.local)
```bash
# OpenAI 設定
OPENAI_API_KEY=sk-your-development-openai-api-key
NEXT_PUBLIC_OPENAI_API_KEY=sk-your-development-openai-api-key

# ローカル設定
NEXT_PUBLIC_APP_URL=http://localhost:3000
VOICEVOX_SERVER_URL=http://localhost:50021
NEXT_PUBLIC_VOICEVOX_SERVER_URL=http://localhost:50021

# デバッグ設定
LOG_LEVEL=debug
NODE_ENV=development
```

### 2. 静的ファイルの準備

#### 音声ファイル構造
```
public/
├── audio/
│   ├── ja/                    # 日本語音声ファイル
│   │   ├── welcome_2.wav
│   │   ├── welcome_3.wav
│   │   ├── transaction_type_2.wav
│   │   ├── transaction_type_3.wav
│   │   └── ...
│   └── en/                    # 英語音声ファイル
│       ├── welcome_2.wav
│       ├── welcome_3.wav
│       └── ...
├── models/                    # Vosk音声認識モデル
│   ├── vosk-model-ja-0.22/
│   └── vosk-model-en-us-0.22/
└── configuration.json         # メイン設定ファイル
```

#### 音声ファイル命名規則
```
{audioKey}_{speaker}.wav

例:
- welcome_3.wav          # ウェルカムメッセージ、話者3
- deposit_amount_2.wav   # 預入金額入力、話者2
- error_general_11.wav   # 一般エラー、話者11
```

## 🏗️ Vercel デプロイメント

### 1. Vercel CLI セットアップ
```bash
# Vercel CLI インストール
npm i -g vercel

# ログイン
vercel login

# プロジェクトリンク
vercel link
```

### 2. ビルド設定 (vercel.json)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "next.config.js",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/audio/(.*)",
      "dest": "/audio/$1",
      "headers": {
        "Cache-Control": "public, max-age=31536000"
      }
    },
    {
      "src": "/models/(.*)",
      "dest": "/models/$1",
      "headers": {
        "Cache-Control": "public, max-age=31536000"
      }
    }
  ],
  "functions": {
    "src/app/api/convert-json/route.ts": {
      "maxDuration": 30
    },
    "src/app/api/openai/*/route.ts": {
      "maxDuration": 30
    }
  }
}
```

### 3. Next.js 設定 (next.config.js)
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  
  // 静的ファイル最適化
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // セキュリティヘッダー
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_APP_URL || '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      },
      {
        source: '/audio/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ]
  },
  
  // 環境変数
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // webpack設定
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    }
    return config
  }
}

module.exports = nextConfig
```

### 4. デプロイコマンド
```bash
# 本番デプロイ
vercel --prod

# プレビューデプロイ
vercel

# 環境変数設定
vercel env add OPENAI_API_KEY production
vercel env add NEXT_PUBLIC_OPENAI_API_KEY production
```

## 🔄 CI/CD パイプライン

### GitHub Actions ワークフロー (.github/workflows/deploy.yml)
```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run linting
        run: npm run lint
      
      - name: Run tests
        run: npm run test
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY_TEST }}

  deploy-preview:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel (Preview)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          scope: ${{ secrets.TEAM_ID }}

  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel (Production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
          scope: ${{ secrets.TEAM_ID }}
```

### GitHub Secrets 設定
```bash
# Vercel設定
VERCEL_TOKEN=your-vercel-token
ORG_ID=your-org-id
PROJECT_ID=your-project-id
TEAM_ID=your-team-id

# API設定
OPENAI_API_KEY_TEST=your-test-openai-api-key
```

## 📊 監視・ログ設定

### 1. Vercel Analytics 設定
```typescript
// src/app/layout.tsx に追加
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### 2. エラー監視 (Sentry)
```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  debug: false,
  integrations: [
    new Sentry.BrowserTracing({
      tracingOrigins: ['localhost', process.env.NEXT_PUBLIC_APP_URL],
    }),
  ],
})

// API エラー監視例
export async function POST(request: Request) {
  try {
    // API処理
  } catch (error) {
    Sentry.captureException(error)
    throw error
  }
}
```

### 3. カスタムログシステム
```typescript
// src/utils/logger.ts
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export class Logger {
  private static instance: Logger
  private logLevel: LogLevel
  
  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO
  }
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }
  
  log(level: LogLevel, message: string, context?: any) {
    if (this.shouldLog(level)) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        context,
        url: typeof window !== 'undefined' ? window.location.href : undefined
      }
      
      console.log(JSON.stringify(logEntry))
      
      // 本番環境では外部ログサービスに送信
      if (process.env.NODE_ENV === 'production') {
        this.sendToLogService(logEntry)
      }
    }
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG]
    return levels.indexOf(level) <= levels.indexOf(this.logLevel)
  }
  
  private async sendToLogService(logEntry: any) {
    // 外部ログサービス（DataDog, CloudWatch等）への送信
  }
}
```

## 🔧 パフォーマンス最適化

### 1. 画像・音声ファイル最適化
```bash
# 音声ファイル圧縮（本番前実行）
npm install -g audiosprite
npm install -g ffmpeg

# WAVファイルを最適化
find public/audio -name "*.wav" -exec ffmpeg -i {} -acodec pcm_s16le -ar 22050 {}.optimized.wav \;

# ファイルサイズチェック
du -sh public/audio/*
```

### 2. Next.js 最適化設定
```typescript
// next.config.js 追加設定
const nextConfig = {
  // ... 既存設定
  
  // 実験的機能
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
  },
  
  // 圧縮設定
  compress: true,
  
  // バンドル分析
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    
    // バンドルサイズ分析
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
        })
      )
    }
    
    return config
  }
}
```

### 3. CDN 設定
```typescript
// Vercel Edge Config (推奨)
const edgeConfig = {
  audio: {
    cacheTtl: 31536000, // 1年
    regions: ['sin1', 'iad1', 'fra1'], // シンガポール、米国東部、フランクフルト
  },
  api: {
    cacheTtl: 300, // 5分
    regions: ['auto'],
  }
}
```

## 🛡️ セキュリティ設定

### 1. Content Security Policy
```typescript
// next.config.js セキュリティヘッダー
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      media-src 'self' blob:;
      connect-src 'self' https://api.openai.com https://*.voicevox.com wss://;
      font-src 'self' data:;
      frame-src 'none';
    `.replace(/\s{2,}/g, ' ').trim()
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }
]
```

### 2. API レート制限
```typescript
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const rateLimitMap = new Map()

export function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1'
  const now = Date.now()
  const windowMs = 60 * 1000 // 1分
  const maxRequests = 100
  
  const requestLog = rateLimitMap.get(ip) || []
  const recentRequests = requestLog.filter((time: number) => now - time < windowMs)
  
  if (recentRequests.length >= maxRequests) {
    return new NextResponse('Too Many Requests', { 
      status: 429,
      headers: {
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': (now + windowMs).toString(),
      }
    })
  }
  
  recentRequests.push(now)
  rateLimitMap.set(ip, recentRequests)
  
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
```

## 📋 運用チェックリスト

### デプロイ前チェック
- [ ] 環境変数が正しく設定されている
- [ ] OpenAI API キーが有効
- [ ] 音声ファイルが適切に配置されている
- [ ] 設定ファイル（configuration.json）が正しい
- [ ] ビルドエラーがない
- [ ] TypeScript型チェック通過
- [ ] ESLint警告がない
- [ ] テストがすべて通過

### デプロイ後チェック
- [ ] サイトが正常にアクセスできる
- [ ] 音声認識が動作する
- [ ] 音声出力が動作する
- [ ] 言語切り替えが機能する
- [ ] 管理画面にアクセスできる
- [ ] API エンドポイントが応答する
- [ ] モバイルデバイスで正常動作
- [ ] HTTPS接続が有効
- [ ] セキュリティヘッダーが設定されている

### 定期メンテナンス
- [ ] 依存関係の更新
- [ ] セキュリティパッチ適用
- [ ] ログの確認・分析
- [ ] パフォーマンス監視
- [ ] バックアップの確認
- [ ] 音声ファイルの整理
- [ ] API使用量の監視
- [ ] エラーレート監視

## 🆘 トラブルシューティング

### 一般的な問題と解決法

#### 1. 音声認識が動作しない
```bash
# ブラウザ対応確認
console.log('getUserMedia supported:', !!navigator.mediaDevices?.getUserMedia)
console.log('SpeechRecognition supported:', !!window.SpeechRecognition || !!window.webkitSpeechRecognition)

# Voskモデル確認
ls -la public/models/
curl -I https://your-domain.com/models/vosk-model-ja-0.22/
```

#### 2. OpenAI API エラー
```typescript
// API キー確認
const testApiKey = async () => {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      }
    })
    console.log('API Key valid:', response.ok)
  } catch (error) {
    console.error('API Key test failed:', error)
  }
}
```

#### 3. 音声ファイル再生エラー
```typescript
// 音声ファイル存在確認
const checkAudioFile = async (audioPath: string) => {
  try {
    const response = await fetch(audioPath, { method: 'HEAD' })
    console.log(`Audio file ${audioPath}:`, response.ok ? 'EXISTS' : 'NOT FOUND')
    console.log('Content-Type:', response.headers.get('content-type'))
    console.log('Content-Length:', response.headers.get('content-length'))
  } catch (error) {
    console.error(`Failed to check ${audioPath}:`, error)
  }
}
```

## 📞 サポート・連絡先

### 技術サポート
- **GitHub Issues**: [リポジトリURL]/issues
- **ドキュメント**: [ドキュメントURL]
- **開発者コミュニティ**: [コミュニティURL]

### 緊急時対応
1. **サービス停止時**: ロールバック手順を実行
2. **セキュリティインシデント**: 該当サービス一時停止
3. **データ損失**: バックアップからの復旧

このガイドに従って、安全で効率的なデプロイメントと運用を実現してください。