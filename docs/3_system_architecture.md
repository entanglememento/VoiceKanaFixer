# システム設計書 - UML図とアーキテクチャ

## 🏗️ システム全体アーキテクチャ

### レイヤードアーキテクチャ図

```mermaid
graph TB
    subgraph "Presentation Layer"
        UI[User Interface]
        Admin[Admin Interface]
    end
    
    subgraph "Application Layer"
        ChatContainer[Chat Container]
        Management[Management Components]
        Hooks[Custom Hooks]
    end
    
    subgraph "Service Layer"
        VoiceRec[Voice Recognition]
        VoiceOut[Voice Output]
        KeywordMatch[Keyword Matching]
        OpenAIServ[OpenAI Service]
        FlowMgmt[Flow Management]
    end
    
    subgraph "Data Layer"
        ConfigFiles[Configuration Files]
        AudioFiles[Audio Files]
        Models[Vosk Models]
        Cache[Memory Cache]
    end
    
    subgraph "External Services"
        OpenAI[OpenAI API]
        VoiceVox[VOICEVOX API]
        Browser[Browser APIs]
    end
    
    UI --> ChatContainer
    Admin --> Management
    ChatContainer --> Hooks
    Management --> Hooks
    
    Hooks --> VoiceRec
    Hooks --> VoiceOut
    Hooks --> KeywordMatch
    Hooks --> FlowMgmt
    
    VoiceRec --> Browser
    VoiceOut --> AudioFiles
    VoiceOut --> VoiceVox
    KeywordMatch --> ConfigFiles
    FlowMgmt --> ConfigFiles
    FlowMgmt --> Cache
    
    OpenAIServ --> OpenAI
    Management --> OpenAIServ
```

## 📋 クラス図 (UML Class Diagram)

```mermaid
classDiagram
    class ChatContainer {
        -flowData: OptimizedChatFlow
        -isLoading: boolean
        -language: Language
        +loadFlowData(): Promise~void~
        +handleUserInteraction(): void
        +handleHomeClick(): void
    }
    
    class ConversationFlow {
        -chatState: ChatState
        -currentNode: ChatNode
        -keywordMatcher: KeywordMatcher
        +handleChoiceSelect(choice: Choice): void
        +handleTextInput(text: string): void
        +handleInputSubmit(value: string): void
        +resetConversation(): void
    }
    
    class KeywordMatcher {
        -config: KeywordMatcherConfig
        +getBestMatch(input: string, choices: Choice[]): MatchResult
        +findBestMatches(input: string, choices: Choice[]): MatchResult[]
        -calculateMatchScore(input: string, choice: Choice): number
        -normalizeText(text: string): string
        -calculateSimilarity(text1: string, text2: string): number
    }
    
    class VoiceRecognitionService {
        -voskRecognizer: any
        -speechRecognition: any
        -isRecording: boolean
        -language: Language
        +startRecognition(): Promise~void~
        +stopRecognition(): void
        +isSupported(): boolean
        -initializeVosk(): Promise~void~
        -initializeWebSpeech(): void
    }
    
    class VoiceOutputService {
        -currentAudio: HTMLAudioElement
        -language: Language
        -selectedSpeaker: number
        +speak(text: string, audioKey?: string): Promise~void~
        +stop(): void
        +isSupported(): boolean
        -findAudioFile(audioKey: string): Promise~string~
        -speakWithTTS(text: string): Promise~void~
    }
    
    class OpenAIService {
        -openai: OpenAI
        -apiKey: string
        +translateContent(text: string, language: Language): Promise~string~
        +convertConfiguration(config: OriginalConfiguration): Promise~OptimizedChatFlow~
        +optimizeForVoice(text: string): Promise~string~
        -createChatCompletion(messages: any[]): Promise~string~
    }
    
    class AudioFileDetector {
        +detectAvailableFiles(language: Language): Promise~string[]~
        +checkFileExists(filePath: string): Promise~boolean~
        +getSpeakerFiles(audioKey: string, language: Language): Promise~SpeakerFile[]~
    }
    
    ChatContainer --> ConversationFlow
    ConversationFlow --> KeywordMatcher
    ChatContainer --> VoiceRecognitionService
    ChatContainer --> VoiceOutputService
    VoiceOutputService --> AudioFileDetector
    ConversationFlow --> OpenAIService
```

## 🔄 シーケンス図 - ユーザー音声入力処理

```mermaid
sequenceDiagram
    participant User
    participant UI as ChatContainer
    participant VR as VoiceRecognitionService
    participant KM as KeywordMatcher
    participant CF as ConversationFlow
    participant VO as VoiceOutputService
    participant AF as AudioFileDetector
    
    User->>UI: 音声入力開始
    UI->>VR: startRecognition()
    
    Note over VR: マイクアクセス取得
    VR->>VR: getUserMedia()
    VR->>VR: initializeVosk()
    
    User->>VR: 音声データ
    VR->>VR: 音声をテキストに変換
    VR->>UI: onResult(認識テキスト)
    
    UI->>CF: handleTextInput(text)
    CF->>KM: getBestMatch(text, choices)
    
    Note over KM: キーワードマッチング実行
    KM->>KM: normalizeText()
    KM->>KM: calculateMatchScore()
    KM->>CF: MatchResult
    
    alt 高信頼度マッチ
        CF->>CF: handleChoiceSelect()
        CF->>UI: 状態更新通知
    else 中信頼度マッチ
        CF->>UI: 確認質問表示
    else 低信頼度マッチ
        CF->>UI: 選択肢表示
    end
    
    UI->>VO: speak(responseText, audioKey)
    VO->>AF: findAudioFile(audioKey)
    
    alt 音声ファイル存在
        AF->>VO: audioFilePath
        VO->>VO: playAudioFile()
    else 音声ファイル不在
        VO->>VO: speakWithTTS()
    end
    
    VO->>User: 音声出力
    UI->>User: 画面更新
```

## 🔧 コンポーネント図 - システム構成要素

```mermaid
graph TD
    subgraph "Frontend Application"
        subgraph "Pages"
            MainApp[Main Application]
            ManagementPage[Management Page]
        end
        
        subgraph "Chat Components"
            ChatContainer[Chat Container]
            MessageBubble[Message Bubble]
            ChoiceButtons[Choice Buttons]
            InputField[Input Field]
            QRDisplay[QR Code Display]
        end
        
        subgraph "Management Components"
            ContentPreview[Content Preview]
            ContentManager[Content Manager]
            FlowVisualization[Flow Visualization]
            SpeakerSelector[Speaker Selector]
        end
        
        subgraph "UI Components"
            LanguageSelector[Language Selector]
            SettingsButton[Settings Button]
            ApiKeySettings[API Key Settings]
        end
    end
    
    subgraph "Custom Hooks"
        ConversationFlowHook[useConversationFlow]
        VoiceHook[useVoice]
    end
    
    subgraph "Services"
        VoiceRecognitionSvc[Voice Recognition]
        VoiceOutputSvc[Voice Output]
        KeywordMatchingSvc[Keyword Matching]
        OpenAISvc[OpenAI Service]
    end
    
    subgraph "Utilities"
        FlowConverter[Flow Converter]
        AudioDetector[Audio File Detector]
        ResponseStrategy[Response Strategy]
    end
    
    subgraph "API Routes"
        ConvertJsonAPI[/api/convert-json]
        SaveAudioAPI[/api/save-audio]
        TranslateAPI[/api/translate]
        OpenAIAPI[/api/openai/*]
    end
    
    MainApp --> ChatContainer
    ManagementPage --> ContentPreview
    ManagementPage --> ContentManager
    
    ChatContainer --> ConversationFlowHook
    ChatContainer --> VoiceHook
    ChatContainer --> MessageBubble
    ChatContainer --> ChoiceButtons
    
    ConversationFlowHook --> KeywordMatchingSvc
    VoiceHook --> VoiceRecognitionSvc
    VoiceHook --> VoiceOutputSvc
    
    VoiceOutputSvc --> AudioDetector
    KeywordMatchingSvc --> ResponseStrategy
    
    ContentManager --> OpenAISvc
    OpenAISvc --> OpenAIAPI
    FlowConverter --> ConvertJsonAPI
```

## 📊 状態遷移図 - 会話フロー管理

```mermaid
stateDiagram-v2
    [*] --> Loading
    Loading --> LanguageSelection : システム初期化完了
    
    LanguageSelection --> ChatStarted : 言語選択
    
    state ChatStarted {
        [*] --> WelcomeMessage
        WelcomeMessage --> TransactionType : 2秒後自動遷移
        
        state TransactionType {
            [*] --> WaitingForChoice
            WaitingForChoice --> ProcessingInput : ユーザー入力
            ProcessingInput --> HighConfidence : 高信頼度マッチ
            ProcessingInput --> MediumConfidence : 中信頼度マッチ
            ProcessingInput --> LowConfidence : 低信頼度マッチ
            
            HighConfidence --> NextNode : 直接遷移
            MediumConfidence --> ConfirmationDialog : 確認質問
            LowConfidence --> ChoiceDisplay : 選択肢表示
            
            ConfirmationDialog --> NextNode : Yes
            ConfirmationDialog --> WaitingForChoice : No
            ChoiceDisplay --> WaitingForChoice : 再入力待ち
        }
        
        TransactionType --> DepositFlow : 預入選択
        TransactionType --> WithdrawalFlow : 払出選択
        TransactionType --> TransferFlow : 振込選択
        
        state DepositFlow {
            [*] --> AmountInput
            AmountInput --> AmountConfirmation : 金額入力
            AmountConfirmation --> StaffAssistance : 20万円超過
            AmountConfirmation --> Processing : 確認OK
            Processing --> Complete
        }
        
        state WithdrawalFlow {
            [*] --> AmountInput
            AmountInput --> AmountConfirmation : 金額入力
            AmountConfirmation --> StaffAssistance : 20万円超過
            AmountConfirmation --> Processing : 確認OK
            Processing --> Complete
        }
        
        state TransferFlow {
            [*] --> CountrySelection
            CountrySelection --> RecipientInfo : 国選択
            RecipientInfo --> AmountInput : 受取人情報
            AmountInput --> Confirmation : 金額入力
            Confirmation --> StaffAssistance : 要人的対応
            Confirmation --> Processing : 自動処理可能
            Processing --> Complete
        }
        
        Complete --> QRCodeDisplay
        StaffAssistance --> QRCodeDisplay
        QRCodeDisplay --> [*] : 新規取引または終了
    }
    
    ChatStarted --> [*] : ホームボタン
    
    note right of StaffAssistance
        高額取引または
        複雑な手続きの場合
    end note
    
    note right of QRCodeDisplay
        取引完了
        QRコード表示
    end note
```

## 🎯 ユースケース図

```mermaid
graph LR
    subgraph "利用者"
        Customer[顧客]
        Admin[管理者]
    end
    
    subgraph "システム機能"
        subgraph "顧客向け機能"
            UC1[言語選択]
            UC2[音声対話]
            UC3[取引選択]
            UC4[金額入力]
            UC5[取引確認]
            UC6[QRコード受取]
        end
        
        subgraph "管理者向け機能"
            UC7[コンテンツ管理]
            UC8[音声ファイル生成]
            UC9[フロー編集]
            UC10[設定管理]
            UC11[プレビュー機能]
        end
        
        subgraph "システム機能"
            UC12[音声認識]
            UC13[キーワードマッチング]
            UC14[AI翻訳]
            UC15[フロー自動更新]
        end
    end
    
    Customer --> UC1
    Customer --> UC2
    Customer --> UC3
    Customer --> UC4
    Customer --> UC5
    Customer --> UC6
    
    Admin --> UC7
    Admin --> UC8
    Admin --> UC9
    Admin --> UC10
    Admin --> UC11
    
    UC2 --> UC12
    UC2 --> UC13
    UC7 --> UC14
    UC9 --> UC15
    
    UC12 -.-> UC13 : includes
    UC8 -.-> UC14 : includes
    UC9 -.-> UC15 : includes
```

## 🔐 セキュリティ設計図

```mermaid
graph TD
    subgraph "クライアント側セキュリティ"
        A[入力検証] --> B[XSSフィルタリング]
        B --> C[CSRFトークン]
        C --> D[ローカルストレージ暗号化]
    end
    
    subgraph "API セキュリティ"
        E[HTTPS通信] --> F[APIキー検証]
        F --> G[レート制限]
        G --> H[入力サニタイゼーション]
    end
    
    subgraph "データ保護"
        I[設定ファイル暗号化] --> J[音声データ一時保存]
        J --> K[PII情報マスキング]
        K --> L[監査ログ]
    end
    
    subgraph "外部サービス"
        M[OpenAI API暗号化]
        N[VOICEVOX ローカル接続]
        O[Vosk オフライン処理]
    end
    
    D --> E
    H --> I
    L --> M
    I --> N
    I --> O
```

## 📈 パフォーマンス設計図

```mermaid
graph TD
    subgraph "フロントエンド最適化"
        A[コンポーネント遅延読み込み] --> B[メモリ効率的な状態管理]
        B --> C[音声ファイルキャッシュ]
        C --> D[レスポンシブ画像]
    end
    
    subgraph "API最適化"
        E[レスポンスキャッシュ] --> F[並列処理]
        F --> G[接続プール]
        G --> H[圧縮]
    end
    
    subgraph "音声処理最適化"
        I[ストリーミング処理] --> J[バッファリング]
        J --> K[品質自動調整]
        K --> L[フォールバック戦略]
    end
    
    subgraph "データ最適化"
        M[設定ファイル差分更新] --> N[音声ファイル圧縮]
        N --> O[メモリ管理]
        O --> P[ガベージコレクション]
    end
    
    D --> E
    H --> I
    L --> M
```

## 🔄 データフロー図 (DFD)

```mermaid
graph TD
    subgraph "External Entities"
        User[ユーザー]
        Admin[管理者]
        OpenAI_API[OpenAI API]
        VOICEVOX_API[VOICEVOX API]
    end
    
    subgraph "Processes"
        P1[音声認識処理]
        P2[キーワードマッチング]
        P3[会話フロー管理]
        P4[音声出力処理]
        P5[設定管理]
        P6[翻訳処理]
    end
    
    subgraph "Data Stores"
        DS1[(設定ファイル)]
        DS2[(音声ファイル)]
        DS3[(会話履歴)]
        DS4[(キャッシュ)]
    end
    
    User -->|音声入力| P1
    P1 -->|認識テキスト| P2
    P2 -->|マッチ結果| P3
    P3 -->|応答テキスト| P4
    P4 -->|音声出力| User
    
    Admin -->|設定更新| P5
    P5 -->|更新データ| DS1
    DS1 -->|設定読み込み| P3
    
    P6 -->|翻訳リクエスト| OpenAI_API
    OpenAI_API -->|翻訳結果| P6
    P6 -->|翻訳データ| DS1
    
    P4 -->|音声生成| VOICEVOX_API
    VOICEVOX_API -->|音声データ| DS2
    DS2 -->|音声ファイル| P4
    
    P3 -->|履歴保存| DS3
    DS3 -->|履歴参照| P3
    
    P2 -->|マッチ結果| DS4
    DS4 -->|キャッシュデータ| P2
```

## 📐 配置図 (Deployment Diagram)

```mermaid
graph TB
    subgraph "クライアント環境"
        Browser[Webブラウザ]
        Microphone[マイク]
        Speaker[スピーカー]
        LocalStorage[ローカルストレージ]
    end
    
    subgraph "Webサーバー (Vercel/Next.js)"
        WebServer[Next.js アプリケーション]
        StaticFiles[静的ファイル配信]
        APIRoutes[API ルート]
    end
    
    subgraph "外部サービス"
        OpenAI[OpenAI API]
        VercelEdge[Vercel Edge Functions]
    end
    
    subgraph "ローカルサービス (オプション)"
        VOICEVOX[VOICEVOX Server]
        LocalModels[Vosk モデル]
    end
    
    Browser -.->|HTTPS| WebServer
    Browser -.->|Static Assets| StaticFiles
    Browser -.->|API Calls| APIRoutes
    
    APIRoutes -.->|AI Requests| OpenAI
    APIRoutes -.->|Serverless| VercelEdge
    
    Browser -.->|Direct Connection| VOICEVOX
    Browser -.->|Local Processing| LocalModels
    
    Browser --> Microphone
    Browser --> Speaker
    Browser --> LocalStorage
    
    WebServer --> StaticFiles
    WebServer --> APIRoutes
```

これらのUML図とアーキテクチャ図により、システムの設計と構造を包括的に理解できます。各図は異なる視点からシステムを表現し、開発者が全体像を把握しやすくなっています。