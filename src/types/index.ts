// 型定義ファイル

// 言語タイプ
export type Language = 'ja' | 'en'

// ノードタイプ
export type NodeType = 'message' | 'choice' | 'input' | 'confirmation' | 'qr_display'

// チャットノード
export interface ChatNode {
  id: string
  type: NodeType
  content: string
  reading?: string
  voiceFile?: string
  next?: string
  choices?: Choice[]
  field?: string
  label?: string
}

// 選択肢
export interface Choice {
  id: string
  text: string
  keywords?: string[]
  excludeKeywords?: string[]
  next: string
}

// 設定
export interface Settings {
  autoStopSeconds: number
  voiceSpeed: number
  qrPassword: string
  qrExpiryMinutes: number
}

// 言語設定
export interface LanguageConfig {
  languageSelection: boolean
  settings: Settings
  nodes: Record<string, ChatNode>
}

// 最適化されたJSON構造
export interface OptimizedChatFlow {
  version: string
  storeName: string
  languages: Record<Language, LanguageConfig>
}

// 元のJSON構造（configuration.json）
export interface OriginalWorkflow {
  id: string
  title: string
  type: 'G' | 'N' | 'S'
  group?: {
    id: string
    workFlow: OriginalWorkflow[]
  }
  content?: {
    component: string
    customizedData: {
      items: Array<{
        type: string
        id: string
        field?: string
        codeId?: string
        label?: string
        isNewVal?: boolean
      }>
    }
    navText: string
    header: number
    footer?: Record<string, unknown>
  }
  branches?: Array<{
    id: string
    workFlow: OriginalWorkflow[]
  }>
}

export interface OriginalConfiguration {
  layouts: {
    topmenu: Record<string, unknown>
    headers: Record<string, unknown>[]
    nodecontents: Record<string, unknown>[]
  }
  codedef: {
    codes: Array<{
      codeid: string
      label: string
      items: Array<{
        label: string
        value: string
      }>
    }>
  }
  errcodedef?: Record<string, unknown>
  commonData?: Record<string, unknown>
  wfmanager?: {
    domainWorkflows?: Array<{
      id: string
      menuTitle: string
      menuSubTitle: string
      domainData: Record<string, {
        index: number
        name: string
        type: string
        value: string
      }>
      rootWorkFlow: {
        id: string
        workFlow: OriginalWorkflow[]
      }
    }>
    domainWorkFlows?: Array<{
      id: string
      menuTitle: string
      menuSubTitle: string
      domainData: Record<string, {
        index: number
        name: string
        type: string
        value: string
      }>
      rootWorkflow: {
        id: string
        workflow: OriginalWorkflow[]
      }
    }>
  }
}

// チャット状態
export interface ChatState {
  currentNode: string
  language: Language
  history: ChatMessage[]
  userInputs: Record<string, string>
  isComplete: boolean
}

// チャットメッセージ
export interface ChatMessage {
  id: string
  type: 'bot' | 'user'
  content: string
  timestamp: Date
  hasBeenSpoken?: boolean
}

export interface VoicevoxSpeaker {
  id: number;
  name: string;
  styles: {
    name: string;
    id: number;
  }[];
}

export interface VoicevoxService {
  initialize(): Promise<void>;
  isInitialized(): boolean;
  getSpeakers(): Promise<VoicevoxSpeaker[]>;
  generateAudio(text: string, speaker: number | string): Promise<ArrayBuffer | Blob>;
  saveAudioFile(text: string, nodeId: string, speaker: number | string): Promise<string>;
  isAvailable(): Promise<boolean>;
  getAvailableSpeakers(): VoicevoxSpeaker[];
  voicevoxEngineUrl?: string;
}