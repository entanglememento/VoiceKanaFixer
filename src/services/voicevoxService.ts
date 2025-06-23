'use client'

import axios from 'axios';
import { VoicevoxSpeaker } from '@/types';

export class VoicevoxService {
  private baseUrl: string;
  private speakers: VoicevoxSpeaker[] = [];
  private initialized: boolean = false;
  public voicevoxEngineUrl: string;

  constructor(baseUrl: string = 'http://localhost:50021') {
    this.baseUrl = baseUrl;
    this.voicevoxEngineUrl = baseUrl;
  }

  async initialize(): Promise<void> {
    try {
      const response = await axios.get<VoicevoxSpeaker[]>(`${this.baseUrl}/speakers`);
      this.speakers = response.data;
      this.initialized = true;
    } catch (error) {
      console.error('VOICEVOXの初期化に失敗しました:', error);
      throw new Error('VOICEVOXの初期化に失敗しました');
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async getSpeakers(): Promise<VoicevoxSpeaker[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.speakers;
  }

  async generateAudio(text: string, speaker: number | string): Promise<Blob> {
    if (!this.initialized) {
      throw new Error('VOICEVOXが初期化されていません');
    }

    try {
      // 音声合成用のクエリを生成
      const speakerId = typeof speaker === 'string' ? parseInt(speaker, 10) : speaker;
      
      // speakerIdの検証
      if (isNaN(speakerId)) {
        throw new Error('無効な話者IDです');
      }

      // 話者の存在確認
      const availableSpeakers = await this.getSpeakers();
      const speakerExists = availableSpeakers.some(s => s.styles.some(style => style.id === speakerId));
      
      console.log('利用可能な話者IDリスト:', availableSpeakers.flatMap(s => s.styles.map(style => style.id)));
      console.log('要求された話者ID:', speakerId, '存在する:', speakerExists);
      
      if (!speakerExists) {
        throw new Error(`指定された話者ID (${speakerId}) は存在しません。利用可能なID: ${availableSpeakers.flatMap(s => s.styles.map(style => style.id)).join(', ')}`);
      }

      console.log('VOICEVOX音声生成リクエスト:', {
        text: text,
        speaker: speakerId,
        textLength: text.length,
        trimmedText: text.trim()
      });

      // VOICEVOXのAPIには通常のPOSTデータとして送信
      const queryResponse = await axios.post(
        `${this.baseUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`,
        {},
        { 
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // 音声を合成
      const synthesisResponse = await axios.post(
        `${this.baseUrl}/synthesis`,
        queryResponse.data,
        {
          params: { speaker: speakerId },
          responseType: 'arraybuffer'
        }
      );

      // ArrayBufferをBlobに変換
      return new Blob([synthesisResponse.data], { type: 'audio/wav' });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('VOICEVOX API エラー詳細:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          params: error.config?.params
        });
        
        if (error.response?.status === 422) {
          const errorDetail = error.response?.data?.detail || 'パラメータが無効です';
          throw new Error(`無効なリクエストです: ${errorDetail}`);
        } else if (error.response?.status === 500) {
          throw new Error('VOICEVOXエンジンでエラーが発生しました。');
        } else {
          throw new Error(`VOICEVOX APIエラー (${error.response?.status}): ${error.message}`);
        }
      }
      throw error;
    }
  }

  async saveAudioFile(text: string, nodeId: string, speaker: number | string): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const speakerId = typeof speaker === 'string' ? parseInt(speaker, 10) : speaker;
      const audioBlob = await this.generateAudio(text, speakerId);
      
      // サーバーに音声データを送信して保存
      const formData = new FormData();
      formData.append('audio', audioBlob, `${nodeId}_${speakerId}.wav`);
      formData.append('nodeId', nodeId);
      formData.append('speaker', speakerId.toString());
      formData.append('language', 'ja');

      const response = await axios.post('/api/save-audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (!response.data?.filename) {
        throw new Error('音声ファイルの保存に失敗しました: ファイル名が返されませんでした');
      }

      return response.data.filename;
    } catch (error) {
      console.error('音声ファイルの保存に失敗しました:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('音声ファイルの保存に失敗しました');
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/version`);
      return response.status === 200;
    } catch (error) {
      console.error('VOICEVOX接続エラー:', error);
      return false;
    }
  }

  getAvailableSpeakers(): VoicevoxSpeaker[] {
    return this.speakers;
  }
}

// Factory function
export function createVoicevoxService() {
  const service = new VoicevoxService(process.env.NEXT_PUBLIC_VOICEVOX_ENGINE_URL || 'http://localhost:50021');
  
  // 非同期で初期化を開始
  service.initialize().catch(error => {
    console.error('VOICEVOX初期化エラー:', error);
  });
  
  return service;
}

// デフォルト話者設定
export const VOICEVOX_SPEAKERS = {
  ZUNDAMON_NORMAL: 3,     // ずんだもん（ノーマル）
  ZUNDAMON_SWEET: 1,      // ずんだもん（甘え）
  METAN_NORMAL: 2,        // 四国めたん（ノーマル）
  METAN_SWEET: 0,         // 四国めたん（甘え）
  TSUMUGI: 8,             // 春日部つむぎ（ノーマル）
  HAU: 10,                // 雨晴はう（ノーマル）
  RITU: 9,                // 波音リツ（ノーマル）
  TAKEHIRO_NORMAL: 11,    // 玄野武宏（ノーマル）
  TAKEHIRO_JOY: 39,       // 玄野武宏（喜び）
} as const