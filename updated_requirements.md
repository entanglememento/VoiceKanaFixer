# AIチャットアプリ 完全要件定義書

## 1. システム概要

### 1.1 概要
本システムは、店舗での受付・案内業務を自動化するためのオフライン対応チャットアプリケーションです。タブレット端末上で動作し、顧客との音声・テキスト対話を通じて必要な情報を提供します。各店舗に特化した会話フローを事前に設計し、多言語対応とオフライン動作を実現します。

### 1.2 システム構成
- **メインアプリ**: 顧客向けチャットインターface（オフライン動作）
- **管理システム**: 店舗管理者向け編集GUI（オンライン動作）
- **配布システム**: オフラインパッケージの生成・配布機能

### 1.3 主要特徴
- 完全オフライン動作（顧客利用時）
- 多言語対応（日本語・英語、将来的に中国語・韓国語）
- 音声入出力対応
- 店舗ごとのカスタマイズ可能な会話フロー
- QRコード連携によるスマートフォン対応
- PWA対応

## 2. 機能要件

### 2.1 顧客向け機能（メインアプリ）

#### 2.1.1 チャット機能
- **基本対話**: 事前定義された会話フローに基づく対話
- **音声入力**: vosk-browserによるローカル音声認識
- **音声出力**: 事前生成済み音声ファイルの再生
- **テキスト表示**: 音声と連動したテキスト表示
- **選択肢提示**: ボタン形式での回答選択
- **確認対話**: 曖昧な入力に対する確認メッセージ

#### 2.1.2 言語選択機能
- **事前選択**: チャット開始前の言語選択（日本語/英語）
- **設定駆動**: JSONファイルの設定による言語選択有無の制御
- **デフォルト言語**: 日本語（設定により変更可能）

#### 2.1.3 音声制御
- **録音制御**: マイクボタンによる録音開始・停止
- **音声停止**: 録音開始時の出力音声自動停止
- **自動停止**: 無音状態での自動録音終了（3秒、設定可能）
- **音量調整**: 出力音声の音量制御

#### 2.1.4 ユーザーインターフェース
- **トップ画面**: 受付開始案内とタッチ操作誘導
- **チャット画面**: メッセージ履歴、入力コントロール
- **文字サイズ変更**: 2段階（中・大）
- **高コントラストモード**: アクセシビリティ対応
- **ホームボタン**: 任意の画面からトップ画面に戻る機能
- **数字入力**: テンキー表示による数値入力

#### 2.1.5 QRコード機能
- **QRコード生成**: 会話結果に基づく情報のQRコード化
- **簡易暗号化**: クライアントサイドでの基本的な暗号化（サーバー不要）
- **パスワード認証**: スマートフォンでの読み取り時にパスワード入力要求
- **プレーンテキスト表示**: 認証成功時の情報表示
- **有効期限**: 設定可能な期限（デフォルト30分、クライアントサイドで判定）
- **再発行機能**: 同一内容での新規QRコード生成

### 2.2 管理システム機能

#### 2.2.1 JSONファイル管理
- **ファイル選択**: 既存JSONファイルの読み込み・選択
- **店舗別設定**: 店舗ごとのJSONファイル管理
- **基本設定編集**: 店舗名、言語設定、動作パラメータの編集

#### 2.2.2 JSON変換・最適化機能
- **構造変換**: 元JSONからチャット用JSONへの最適化変換
- **OpenAI API連携**: 日本語テキストの英語自動翻訳
  - 元JSONファイル内のすべての日本語テキストを英語に翻訳
  - GPT-4またはGPT-3.5-turboを使用した高品質翻訳
  - 店舗接客コンテキストを考慮した翻訳プロンプト
  - 翻訳結果の確認・修正機能
- **言語ペア生成**: 日本語・英語対応の統合JSONファイル生成
- **変換ログ**: 変換処理の履歴と結果確認

#### 2.2.3 会話フロー編集
- **ビジュアルエディタ**: ノード&リンク形式のフロー編集
- **ノード管理**: 対話ポイントの追加・削除・編集
- **遷移設定**: 条件分岐とフロー制御の設定
- **プレビュー機能**: 編集中フローの実動作確認
- **バージョン管理**: フロー変更履歴の管理とロールバック

#### 2.2.4 多言語コンテンツ管理
- **応答文編集**: 言語別の応答テキスト管理
- **AI翻訳支援**: OpenAI APIによる自動翻訳機能
- **翻訳確認**: AI翻訳結果の確認・修正機能
- **言語設定**: 対応言語の有効/無効切り替え
- **表示内容統一**: 全言語での内容整合性確認

#### 2.2.5 音声ファイル管理
- **音声生成**: VOICEVOXおよびWeb Speech APIとの連携
- **ファイル管理**: 音声ファイルのアップロード・ライブラリ管理
- **音声確認**: 音声とテキストの対応確認・再生テスト
- **一括処理**: 複数音声ファイルの一括生成・更新

#### 2.2.6 キーワード・マッチング設定
- **キーワード登録**: 主要キーワードと類義語の設定
- **除外キーワード**: 誤分類防止のための除外語設定
- **スコア調整**: マッチング閾値の調整
- **テスト機能**: キーワードマッチングのテスト実行

#### 2.2.7 パッケージ管理
- **オフラインパッケージ生成**: JSON+音声ファイルの統合パッケージ作成
- **配布管理**: 店舗ごとのパッケージ配布履歴
- **更新通知**: 新バージョンの配布と更新状況管理

### 2.3 共通機能

#### 2.3.1 データ同期
- **パッケージダウンロード**: 管理システムからのオフラインパッケージ取得
- **バージョンチェック**: 最新バージョンの確認と更新通知
- **キャッシュ管理**: ローカルデータの効率的な管理

#### 2.3.2 セキュリティ機能
- **データ暗号化**: 機密情報の暗号化保存
- **アクセス制御**: 管理システムの権限管理
- **監査ログ**: 管理操作の記録とトレーサビリティ

## 3. 非機能要件

### 3.1 性能要件
- **起動時間**: アプリ起動3秒以内
- **応答時間**: ユーザー入力から応答まで1秒以内
- **音声認識精度**: 静かな環境で90%以上
- **音声再生**: 遅延なしでの即座再生
- **同時利用**: 単一タブレットでの安定動作

### 3.2 可用性要件
- **オフライン動作**: インターネット接続なしでの完全動作
- **稼働時間**: 24時間連続動作可能
- **復旧時間**: エラー時の自動復旧（30秒以内）

### 3.3 拡張性要件
- **店舗数**: 1000店舗までの対応
- **言語追加**: 新言語の容易な追加
- **フロー複雑度**: 100ノード程度までの会話フロー

### 3.4 保守性要件
- **設定変更**: 技術者以外でも可能な設定変更
- **ログ出力**: 問題分析のための詳細ログ
- **バックアップ**: 設定・データの定期バックアップ

### 3.5 セキュリティ要件
- **データ保護**: 個人情報の適切な暗号化
- **アクセス制御**: 管理機能への認証・認可
- **監査証跡**: 操作履歴の記録・保存

## 4. 技術仕様

### 4.1 技術スタック

#### 4.1.1 フロントエンド
- **フレームワーク**: React + Next.js
- **スタイリング**: Tailwind CSS
- **PWA**: Service Worker、Manifest対応
- **状態管理**: React Hooks（useState、useReducer）

#### 4.1.2 音声処理
- **音声認識**: vosk-browser（WASM）
- **日本語音声合成**: VOICEVOX（事前生成）
- **英語音声合成**: Web Speech API（事前録音）
- **音声制御**: Web Audio API

#### 4.1.3 データベース
- **オンライン**: Supabase（PostgreSQL）
- **オフライン**: ローカルファイル（JSON）
- **キャッシュ**: IndexedDB（将来的検討）

#### 4.1.4 ホスティング・デプロイ
- **管理システム**: Vercel
- **メインアプリ**: 静的ファイル配布
- **音声ファイル**: CDN配信（または専用サーバー）

### 4.2 データベース設計

#### 4.2.1 JSONファイル管理テーブル
```
json_files
- id (UUID, Primary Key)
- store_name (VARCHAR, 店舗名)
- original_json (JSONB, 元JSONデータ)
- optimized_json_ja (JSONB, 最適化済み日本語JSON)
- optimized_json_en (JSONB, 最適化済み英語JSON)
- conversion_log (JSONB, 変換処理ログ)
- ai_translation_cost (DECIMAL, 翻訳コスト)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- is_active (BOOLEAN, 有効フラグ)
```

#### 4.2.2 会話フロー管理テーブル
```
flows
- id (UUID, Primary Key)
- json_file_id (UUID, Foreign Key → json_files.id)
- language (VARCHAR, 言語コード)
- version (VARCHAR, バージョン番号)
- flow_data (JSONB, フロー定義データ)
- is_published (BOOLEAN, 公開フラグ)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- created_by (UUID, 作成者ID)
```

#### 4.2.3 音声ファイル管理テーブル
```
voice_files
- id (UUID, Primary Key)
- flow_id (UUID, Foreign Key → flows.id)
- text_key (VARCHAR, テキストキー)
- language (VARCHAR, 言語コード)
- text_content (TEXT, 音声化テキスト)
- file_url (VARCHAR, 音声ファイルURL)
- file_size (INTEGER, ファイルサイズ)
- duration_seconds (DECIMAL, 再生時間)
- voice_type (VARCHAR, 音声タイプ)
- created_at (TIMESTAMP)
- is_active (BOOLEAN)
```

#### 4.2.4 キーワード管理テーブル
```
keywords
- id (UUID, Primary Key)
- flow_id (UUID, Foreign Key → flows.id)
- node_id (VARCHAR, ノードID)
- main_keyword (VARCHAR, メインキーワード)
- synonyms (VARCHAR[], 類義語リスト)
- exclude_keywords (VARCHAR[], 除外キーワード)
- match_score (INTEGER, マッチスコア)
- language (VARCHAR, 言語コード)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### 4.2.5 オフラインパッケージ管理テーブル
```
offline_packages
- id (UUID, Primary Key)
- json_file_id (UUID, Foreign Key → json_files.id)
- version (VARCHAR, パッケージバージョン)
- package_url (VARCHAR, パッケージファイルURL)
- package_size (INTEGER, パッケージサイズ)
- includes_voice_files (BOOLEAN, 音声ファイル含有フラグ)
- generated_at (TIMESTAMP)
- download_count (INTEGER, ダウンロード回数)
- is_latest (BOOLEAN, 最新版フラグ)
```

#### 4.2.6 利用ログテーブル（シンプル版）
```
usage_logs
- id (UUID, Primary Key)
- store_name (VARCHAR, 店舗名)
- session_id (VARCHAR, セッションID)
- language (VARCHAR, 使用言語)
- started_at (TIMESTAMP, 開始時刻)
- ended_at (TIMESTAMP, 終了時刻)
- total_interactions (INTEGER, 総対話回数)
- completed_flow (BOOLEAN, フロー完了フラグ)
- final_node_id (VARCHAR, 最終到達ノード)
```

#### 4.2.7 OpenAI API使用ログテーブル
```
openai_usage_logs
- id (UUID, Primary Key)
- json_file_id (UUID, Foreign Key → json_files.id)
- api_endpoint (VARCHAR, 使用エンドポイント)
- input_tokens (INTEGER, 入力トークン数)
- output_tokens (INTEGER, 出力トークン数)
- cost_usd (DECIMAL, コスト（USD）)
- processing_time_ms (INTEGER, 処理時間)
- created_at (TIMESTAMP)
- status (VARCHAR, 処理ステータス)
```

### 4.3 JSON構造仕様

#### 4.3.1 チャット用最適化JSON構造
管理システムで変換後のJSON構造：
```json
{
  "version": "1.0",
  "storeName": "サンプル店舗",
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
          "type": "message",
          "content": "いらっしゃいませ...",
          "voiceFile": "start_ja.wav",
          "next": "menu"
        },
        "menu": {
          "type": "choice",
          "content": "ご用件をお聞かせください",
          "voiceFile": "menu_ja.wav",
          "choices": [
            {
              "id": "reservation",
              "text": "予約について",
              "keywords": ["予約", "席", "ブッキング"],
              "excludeKeywords": ["キャンセル"],
              "next": "reservation_flow"
            }
          ]
        }
      }
    },
    "en": {
      "languageSelection": true,
      "settings": {
        "autoStopSeconds": 3,
        "voiceSpeed": 1.0,
        "qrPassword": "1234",
        "qrExpiryMinutes": 30
      },
      "nodes": {
        "start": {
          "type": "message",
          "content": "Welcome to our store...",
          "voiceFile": "start_en.wav",
          "next": "menu"
        },
        "menu": {
          "type": "choice",
          "content": "How may I help you?",
          "voiceFile": "menu_en.wav",
          "choices": [
            {
              "id": "reservation",
              "text": "About reservations",
              "keywords": ["reservation", "booking", "table"],
              "excludeKeywords": ["cancel"],
              "next": "reservation_flow"
            }
          ]
        }
      }
    }
  }
}
```

#### 4.3.2 OpenAI API翻訳処理仕様
- **翻訳対象**: 全てのユーザー向けテキスト（メッセージ、選択肢、キーワードなど）
- **翻訳モデル**: GPT-4またはGPT-3.5-turbo
- **翻訳プロンプト**: コンテキストを考慮した店舗接客用翻訳
- **品質確認**: 翻訳結果の確認・修正機能
- **コスト管理**: トークン使用量とコストの記録

## 5. 必要なソフトウェア・サービス（基本無料、一部従量課金）

### 5.1 開発・管理側
- **Next.js**: 無料フレームワーク
- **React**: 無料ライブラリ
- **Tailwind CSS**: 無料CSSフレームワーク
- **Supabase**: 無料プラン有り（月間MAU 50,000まで）
- **Vercel**: 無料プラン有り（個人利用・小規模プロジェクト）
- **OpenAI API**: 従量課金（翻訳機能のみ使用、初期設定時のみ）

### 5.2 顧客利用側（オフライン）
- **vosk-browser**: 無料（WASM版音声認識）
- **VOICEVOX**: 無料（日本語音声合成、事前生成）
- **Web Speech API**: 無料（ブラウザ標準、英語音声）
- **Web Audio API**: 無料（ブラウザ標準）

### 5.3 音声ファイル配信
- **CDN**: 無料プラン有り（Cloudflare等）
- **静的ファイルホスティング**: 無料プラン有り（Netlify、GitHub Pages等）

## 6. 今後の拡張計画(開発時にこの拡張も意識して開発すること)

### 6.1 機能拡張
- **AI機能**: ローカルLLMの統合検討
- **多言語対応**: 中国語・韓国語・その他言語の追加
- **分析機能**: より詳細な利用分析とレポート機能
- **統合機能**: 既存店舗システムとの連携

### 6.2 技術進化対応
- **新音声技術**: より高精度な音声認識・合成技術の採用
- **UI/UX改善**: 新しいインタラクション手法の導入
- **モバイル対応**: スマートフォン専用機能の追加

この要件定義書は、システム開発・運用・保守の全フェーズにおいて参照すべき基本文書として位置づけ、プロジェクトの進行に応じて適宜更新・改訂を行います。