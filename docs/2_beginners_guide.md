# 初学者向け解説書 - クラス・メソッド詳細ガイド

## 🎓 このガイドについて

このドキュメントは、AIチャットボットアプリケーションの仕組みを理解したい初学者向けに、各クラスの役割やメソッドを詳しく解説します。

## 📁 ファイル構造の理解

```
src/
├── app/                    # Next.jsのページとAPI
├── components/             # 再利用可能なUIコンポーネント
├── hooks/                  # カスタムReactフック
├── services/               # ビジネスロジック
├── types/                  # TypeScript型定義
└── utils/                  # ユーティリティ関数
```

## 🧩 主要コンポーネント解説

### 1. ChatContainer (`src/components/Chat/ChatContainer.tsx`)

**役割**: チャット画面全体を管理するメインコンポーネント

#### 主要な状態（State）
```typescript
const [flowData, setFlowData] = useState<OptimizedChatFlow>()
// 会話フローのデータを保存

const [isLoading, setIsLoading] = useState(true)
// 読み込み中かどうかの状態
```

#### 重要なメソッド
```typescript
// フローデータを非同期で取得
const loadFlowData = async () => {
  const data = await getRealBankingFlowFromConfiguration()
  setFlowData(data)
}

// ユーザーの操作で音声を停止
const handleUserInteraction = () => {
  if (isSpeaking) stopSpeaking()
}
```

**学習ポイント**: このコンポーネントは「親コンポーネント」として、子コンポーネントを統制し、データを渡す役割を持っています。

### 2. useConversationFlow (`src/hooks/useConversationFlow.ts`)

**役割**: 会話の流れを管理するカスタムフック

#### 主要な状態管理
```typescript
const [chatState, setChatState] = useState<ChatState>({
  currentNode: 'start',        // 現在の会話ノード
  language,                    // 選択された言語
  history: [],                 // 会話履歴
  userInputs: {},             // ユーザー入力データ
  isComplete: false           // 会話完了フラグ
})
```

#### 重要なメソッド解説

**選択肢を選んだ時の処理**
```typescript
const handleChoiceSelect = (choice: Choice) => {
  // 1. ユーザーメッセージを履歴に追加
  const userMessage: ChatMessage = {
    id: Date.now().toString(),
    type: 'user',
    content: choice.text,
    timestamp: new Date()
  }
  
  // 2. 状態を更新して次のノードに移動
  setChatState(prevState => ({
    ...prevState,
    history: [...prevState.history, userMessage],
    currentNode: choice.next
  }))
}
```

**テキスト入力の処理**
```typescript
const handleTextInput = (text: string) => {
  // 1. キーワードマッチングで意図を理解
  const matchResult = keywordMatcher.getBestMatch(text, currentChoices)
  
  // 2. 信頼度に応じて応答を決定
  const response = ResponseStrategy.determineResponse(matchResult)
  
  // 3. 適切な応答を実行
  switch (response.type) {
    case 'direct':      // 高信頼度 → 直接移動
    case 'confirmation': // 中信頼度 → 確認質問
    case 'choices':     // 低信頼度 → 選択肢表示
  }
}
```

**学習ポイント**: フックは「ロジックの再利用」のためのReactの仕組みです。UIと切り離してビジネスロジックを管理できます。

### 3. KeywordMatcher (`src/services/keywordMatcher.ts`)

**役割**: ユーザーの入力テキストから意図を理解するクラス

#### クラス設計
```typescript
export class KeywordMatcher {
  private config: KeywordMatcherConfig
  
  constructor(config: KeywordMatcherConfig) {
    this.config = config
  }
}
```

#### 主要メソッド詳細

**最適なマッチを見つける**
```typescript
getBestMatch(input: string, choices: Choice[]): MatchResult {
  // 1. 入力テキストを正規化（小文字化、記号除去など）
  const normalizedInput = this.normalizeText(input)
  
  // 2. 各選択肢とのマッチ度を計算
  const matches = choices.map(choice => {
    const score = this.calculateMatchScore(normalizedInput, choice)
    return { choice, score, confidence: this.getConfidence(score) }
  })
  
  // 3. 最高スコアのマッチを返す
  return matches.reduce((best, current) => 
    current.score > best.score ? current : best
  )
}
```

**マッチスコアの計算**
```typescript
private calculateMatchScore(input: string, choice: Choice): number {
  let score = 0
  
  // 完全一致チェック（最高スコア）
  if (choice.keywords.some(keyword => input.includes(keyword))) {
    score += 1.0
  }
  
  // 部分マッチチェック
  const partialMatches = choice.keywords.filter(keyword =>
    keyword.includes(input) || input.includes(keyword)
  )
  score += partialMatches.length * 0.5
  
  // 類似度チェック（Levenshtein距離）
  const similarity = this.calculateSimilarity(input, choice.keywords)
  score += similarity * 0.3
  
  return score
}
```

**学習ポイント**: このクラスは「自然言語処理」の基本を実装しています。ユーザーが「お預け入れ」と言っても「預入」と理解できるように設計されています。

### 4. VoiceRecognitionService (`src/services/voiceRecognitionService.ts`)

**役割**: 音声をテキストに変換するサービス

#### クラス構造
```typescript
export class VoiceRecognitionService {
  private voskRecognizer: any = null      // オフライン音声認識
  private speechRecognition: any = null   // ブラウザ音声認識
  private isRecording = false
  private language: Language = 'ja'
}
```

#### 重要なメソッド

**音声認識の開始**
```typescript
async startRecognition(): Promise<void> {
  try {
    // 1. マイクアクセスを取得
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: true 
    })
    
    // 2. Vosk（オフライン）を優先的に使用
    if (this.voskRecognizer) {
      await this.startVoskRecognition(stream)
    } else {
      // 3. フォールバック: Web Speech API
      this.startWebSpeechRecognition()
    }
    
    this.isRecording = true
  } catch (error) {
    console.error('音声認識開始エラー:', error)
    throw error
  }
}
```

**Vosk音声認識の処理**
```typescript
private async startVoskRecognition(stream: MediaStream): Promise<void> {
  // 1. 音声ストリームをVoskに送信
  this.voskRecognizer.start(stream)
  
  // 2. 認識結果を監視
  this.voskRecognizer.addEventListener('result', (event: any) => {
    const result = event.data
    if (result.text && result.text.length > 0) {
      // 3. テキストを正規化してコールバック実行
      const normalizedText = this.normalizeVoiceInput(result.text)
      this.config.onResult(normalizedText)
    }
  })
}
```

**学習ポイント**: このサービスは「フォールバック戦略」を採用しています。オフライン認識が使えない場合は自動的にオンライン認識に切り替わります。

### 5. VoiceOutputService (`src/services/voiceOutputService.ts`)

**役割**: テキストを音声に変換して再生するサービス

#### 音声再生の優先順位
```typescript
async speak(text: string, audioKey?: string): Promise<void> {
  try {
    // 1. 事前録音ファイルを最優先
    if (audioKey) {
      const audioFile = await this.findAudioFile(audioKey)
      if (audioFile) {
        await this.playAudioFile(audioFile)
        return
      }
    }
    
    // 2. フォールバック: TTS（音声合成）
    await this.speakWithTTS(text)
  } catch (error) {
    console.error('音声出力エラー:', error)
  }
}
```

**音声ファイルの検索**
```typescript
private async findAudioFile(audioKey: string): Promise<string | null> {
  const speakers = [2, 3, 11, 22] // 利用可能な話者ID
  
  for (const speaker of speakers) {
    // /public/audio/ja/welcome_3.wav のような形式で検索
    const audioPath = `/audio/${this.language}/${audioKey}_${speaker}.wav`
    
    try {
      const response = await fetch(audioPath, { method: 'HEAD' })
      if (response.ok) {
        return audioPath // ファイルが存在する
      }
    } catch {
      // ファイルが存在しない場合は次の話者を試す
      continue
    }
  }
  
  return null // 該当ファイルなし
}
```

**学習ポイント**: この設計により、高品質な事前録音音声を優先しつつ、録音がない場合でも音声機能が動作し続けます。

### 6. OpenAIService (`src/services/openaiService.ts`)

**役割**: OpenAI APIを使用した翻訳と会話フロー生成

#### 翻訳メソッド
```typescript
async translateContent(
  text: string, 
  targetLanguage: Language
): Promise<string> {
  const prompt = `
    以下のテキストを${targetLanguage === 'ja' ? '日本語' : '英語'}に翻訳してください。
    銀行のカスタマーサービスとして適切な敬語・丁寧語を使用してください。
    
    テキスト: ${text}
  `
  
  const response = await this.openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3, // 一貫性のある翻訳のため
    max_tokens: 500
  })
  
  return response.choices[0]?.message?.content || text
}
```

**設定変換メソッド**
```typescript
async convertConfiguration(config: OriginalConfiguration): Promise<OptimizedChatFlow> {
  const prompt = `
    以下の銀行業務設定を、チャットボット用の会話フローに変換してください。
    
    要求:
    1. 自然な会話の流れを作成
    2. エラーハンドリングを含む
    3. 分かりやすい選択肢を提供
    
    設定: ${JSON.stringify(config, null, 2)}
  `
  
  // OpenAI GPT-4で処理
  const response = await this.openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1 // 構造化されたデータのため
  })
  
  return JSON.parse(response.choices[0]?.message?.content || '{}')
}
```

**学習ポイント**: OpenAI APIは「プロンプトエンジニアリング」と呼ばれる技術で制御します。適切な指示により、高品質な翻訳や変換が可能になります。

## 🔄 データの流れを理解する

### 1. ユーザー入力からレスポンスまで

```typescript
// Step 1: ユーザーが音声で「預入」と発話
// VoiceRecognitionService で処理

// Step 2: テキスト「よにゅう」に変換
const recognizedText = "よにゅう"

// Step 3: KeywordMatcher で意図を理解
const matchResult = keywordMatcher.getBestMatch(recognizedText, [
  { id: 'deposit', text: '預入', keywords: ['預入', '入金', 'よにゅう'] },
  { id: 'withdrawal', text: '払出', keywords: ['払出', '出金'] }
])
// 結果: { choice: deposit, confidence: 'high', score: 0.8 }

// Step 4: ConversationFlow で次のステップを決定
if (matchResult.confidence === 'high') {
  // 直接「預入金額入力」画面に移動
  setChatState(prev => ({
    ...prev,
    currentNode: 'deposit_amount'
  }))
}

// Step 5: VoiceOutputService で応答
await voiceOutput.speak('預入金額を入力してください', 'deposit_amount_3')
```

### 2. 設定更新の流れ

```typescript
// Step 1: configuration.json が更新される

// Step 2: ChatContainer で5秒ごとにチェック
setInterval(async () => {
  const latestFlow = await getRealBankingFlowFromConfiguration()
  if (hasChanges(currentFlow, latestFlow)) {
    setFlowData(latestFlow) // UI即座に更新
  }
}, 5000)

// Step 3: OpenAI で最適化（必要に応じて）
const optimizedFlow = await openAIService.convertConfiguration(newConfig)

// Step 4: キャッシュ更新
updateCachedFlow(optimizedFlow)
```

## 🎨 コンポーネント間の通信

### Props による親子通信
```typescript
// 親コンポーネント (ChatContainer)
<ChoiceButtons 
  choices={currentChoices}
  onChoiceSelect={handleChoiceSelect} // 子から親へのイベント
  isLarge={isLarge}                   // 親から子へのプロパティ
/>

// 子コンポーネント (ChoiceButtons)
const ChoiceButtons = ({ choices, onChoiceSelect, isLarge }) => {
  return (
    <button onClick={() => onChoiceSelect(choice)}>
      {choice.text}
    </button>
  )
}
```

### Custom Hook による状態管理
```typescript
// Hook内で状態を管理
const useConversationFlow = (flowData, language) => {
  const [chatState, setChatState] = useState(initialState)
  
  return {
    chatState,           // 現在の状態
    handleChoiceSelect,  // 操作メソッド
    handleTextInput,     // 操作メソッド
  }
}

// コンポーネントで使用
const { chatState, handleChoiceSelect } = useConversationFlow(flowData, language)
```

## 🛠️ 開発時の注意点

### 1. TypeScript の活用
```typescript
// 型定義を活用してエラーを防ぐ
interface ChatMessage {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: Date
}

// 型に沿った実装
const addMessage = (content: string, type: ChatMessage['type']) => {
  const message: ChatMessage = {
    id: Date.now().toString(),
    type,
    content,
    timestamp: new Date()
  }
  // TypeScriptが型チェックでエラーを防ぐ
}
```

### 2. エラーハンドリング
```typescript
// 段階的なフォールバック
const speakText = async (text: string) => {
  try {
    // 1. 高品質音声ファイル
    await playAudioFile(audioKey)
  } catch {
    try {
      // 2. TTS音声合成
      await speakWithTTS(text)
    } catch {
      // 3. 最終手段：テキスト表示のみ
      showTextOnly(text)
    }
  }
}
```

### 3. パフォーマンス最適化
```typescript
// useCallback でメソッドを最適化
const handleChoiceSelect = useCallback((choice: Choice) => {
  // 処理内容
}, [dependencies]) // 依存関係が変わった時のみ再作成

// useMemo で計算結果をキャッシュ
const expensiveCalculation = useMemo(() => {
  return heavyFunction(data)
}, [data]) // dataが変わった時のみ再計算
```

## 📚 学習の進め方

1. **基本概念の理解**: React、TypeScript、Next.jsの基礎
2. **コンポーネント分析**: 小さなコンポーネントから理解を始める
3. **データフローの追跡**: ユーザーアクションから結果まで追う
4. **サービス層の理解**: ビジネスロジックの仕組みを学ぶ
5. **実際の実装**: 小さな機能追加から始める

このガイドを参考に、徐々にシステム全体の理解を深めていってください。各クラスやメソッドは相互に連携して、スムーズなユーザー体験を提供しています。