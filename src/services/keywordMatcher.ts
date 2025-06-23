import { Choice } from '@/types'

export interface MatchResult {
  choice: Choice
  confidence: number
  matchedKeywords: string[]
  matchType: 'exact' | 'keyword' | 'partial' | 'similarity'
}

export interface MatchingConfig {
  highConfidenceThreshold: number  // 0.8以上で直接遷移
  mediumConfidenceThreshold: number // 0.5-0.8で確認型対話
  enableFuzzyMatching: boolean
  enableSimilarityMatching: boolean
}

export class KeywordMatcher {
  private config: MatchingConfig
  
  constructor(config: Partial<MatchingConfig> = {}) {
    this.config = {
      highConfidenceThreshold: 0.8,
      mediumConfidenceThreshold: 0.5,
      enableFuzzyMatching: true,
      enableSimilarityMatching: true,
      ...config
    }
  }
  
  findBestMatches(input: string, choices: Choice[]): MatchResult[] {
    const results: MatchResult[] = []
    
    for (const choice of choices) {
      const matchResult = this.calculateMatch(input, choice)
      if (matchResult.confidence > 0) {
        results.push(matchResult)
      }
    }
    
    // 信頼度でソート
    return results.sort((a, b) => b.confidence - a.confidence)
  }
  
  getBestMatch(input: string, choices: Choice[]): MatchResult | null {
    const matches = this.findBestMatches(input, choices)
    return matches.length > 0 ? matches[0] : null
  }
  
  getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= this.config.highConfidenceThreshold) {
      return 'high'
    } else if (confidence >= this.config.mediumConfidenceThreshold) {
      return 'medium'
    } else {
      return 'low'
    }
  }
  
  private calculateMatch(input: string, choice: Choice): MatchResult {
    const normalizedInput = this.normalizeText(input)
    let maxConfidence = 0
    let matchedKeywords: string[] = []
    let matchType: MatchResult['matchType'] = 'partial'
    
    // 1. 完全一致チェック
    const normalizedChoiceText = this.normalizeText(choice.text)
    if (normalizedInput === normalizedChoiceText) {
      return {
        choice,
        confidence: 1.0,
        matchedKeywords: [choice.text],
        matchType: 'exact'
      }
    }
    
    // 2. 選択肢テキストの部分一致
    if (normalizedInput.includes(normalizedChoiceText) || normalizedChoiceText.includes(normalizedInput)) {
      maxConfidence = Math.max(maxConfidence, 0.9)
      matchedKeywords.push(choice.text)
      matchType = 'partial'
    }
    
    // 3. キーワード一致チェック
    if (choice.keywords) {
      const keywordMatches = this.checkKeywordMatches(normalizedInput, choice.keywords)
      if (keywordMatches.confidence > maxConfidence) {
        maxConfidence = keywordMatches.confidence
        matchedKeywords = keywordMatches.matchedKeywords
        matchType = 'keyword'
      }
    }
    
    // 4. 除外キーワードチェック
    if (choice.excludeKeywords) {
      const hasExcludedKeyword = choice.excludeKeywords.some(excludeKeyword =>
        normalizedInput.includes(this.normalizeText(excludeKeyword))
      )
      if (hasExcludedKeyword) {
        maxConfidence *= 0.1 // 大幅に信頼度を下げる
      }
    }
    
    // 5. ファジーマッチング
    if (this.config.enableFuzzyMatching && maxConfidence < 0.7) {
      const fuzzyMatch = this.fuzzyMatch(normalizedInput, normalizedChoiceText)
      if (fuzzyMatch > maxConfidence) {
        maxConfidence = fuzzyMatch
        matchType = 'similarity'
      }
    }
    
    // 6. 文字列類似度による補完
    if (this.config.enableSimilarityMatching && maxConfidence < 0.5) {
      const similarity = this.calculateStringSimilarity(normalizedInput, normalizedChoiceText)
      if (similarity > maxConfidence) {
        maxConfidence = similarity
        matchType = 'similarity'
      }
    }
    
    return {
      choice,
      confidence: maxConfidence,
      matchedKeywords,
      matchType
    }
  }
  
  private checkKeywordMatches(input: string, keywords: string[]): {confidence: number, matchedKeywords: string[]} {
    const matchedKeywords: string[] = []
    let totalScore = 0
    
    for (const keyword of keywords) {
      const normalizedKeyword = this.normalizeText(keyword)
      
      if (input.includes(normalizedKeyword)) {
        matchedKeywords.push(keyword)
        
        // 数字の特別処理（高い優先度）
        if (this.isNumberKeyword(keyword)) {
          if (input === normalizedKeyword) {
            totalScore += 15 // 数字の完全一致は非常に高スコア
          } else {
            totalScore += 12 // 数字の部分一致も高スコア
          }
        } else {
          // 通常のキーワード処理
          const keywordLength = normalizedKeyword.length
          
          if (input === normalizedKeyword) {
            totalScore += 10 // 完全一致
          } else if (keywordLength >= 3) {
            totalScore += 7 // 長いキーワードの部分一致
          } else {
            totalScore += 3 // 短いキーワードの部分一致
          }
        }
      }
      
      // 音声認識特有の誤認識に対する処理
      const voiceVariations = this.getVoiceVariations(normalizedKeyword)
      for (const variation of voiceVariations) {
        if (input.includes(variation) && !matchedKeywords.includes(keyword)) {
          matchedKeywords.push(keyword)
          totalScore += this.isNumberKeyword(keyword) ? 10 : 5 // 音声誤認識の場合は少し低めのスコア
        }
      }
    }
    
    // より柔軟なスコア正規化（数字がある場合は15点満点）
    const maxScore = keywords.some(k => this.isNumberKeyword(k)) ? 15 : 10
    const confidence = Math.min(totalScore / maxScore, 1.0)
    
    return { confidence, matchedKeywords }
  }
  
  private isNumberKeyword(keyword: string): boolean {
    const numberPattern = /^[0-9一二三四五六七八九十１２３４５６７８９０]+(番|ばん)?$/
    return numberPattern.test(this.normalizeText(keyword))
  }
  
  private getVoiceVariations(keyword: string): string[] {
    const variations: string[] = []
    
    // 数字の音声認識バリエーション
    const numberMappings: Record<string, string[]> = {
      '1': ['いち', 'ひとつ', 'わん'],
      '2': ['に', 'ふたつ', 'つー'],
      '3': ['さん', 'みっつ', 'すりー'],
      '4': ['よん', 'し', 'よっつ', 'ふぉー'],
      '5': ['ご', 'いつつ', 'ふぁいぶ'],
      '6': ['ろく', 'むっつ', 'しっくす'],
      '7': ['なな', 'しち', 'ななつ', 'せぶん'],
      '8': ['はち', 'やっつ', 'えいと'],
      '9': ['きゅう', 'く', 'ここのつ', 'ないん'],
    }
    
    for (const [number, variations_list] of Object.entries(numberMappings)) {
      if (keyword === number) {
        variations.push(...variations_list)
      }
    }
    
    // よくある音声認識の誤認識パターン
    const commonMisrecognitions: Record<string, string[]> = {
      'よにゅう': ['にゅうきん', 'よきん'],
      'ひきだし': ['ひきだ', 'だし'],
      'ふりこみ': ['ふりく', 'りこみ'],
      'みずほ': ['みず', 'ほう'],
      'mitsubishi': ['みつび', 'つびし'],
    }
    
    if (commonMisrecognitions[keyword]) {
      variations.push(...commonMisrecognitions[keyword])
    }
    
    return variations
  }
  
  private fuzzyMatch(str1: string, str2: string): number {
    // レーベンシュタイン距離を使用したファジーマッチング
    const distance = this.levenshteinDistance(str1, str2)
    const maxLength = Math.max(str1.length, str2.length)
    
    if (maxLength === 0) return 1.0
    
    const similarity = 1 - (distance / maxLength)
    return Math.max(0, similarity - 0.3) // 閾値調整
  }
  
  private calculateStringSimilarity(str1: string, str2: string): number {
    // Jaccard係数による文字列類似度
    const set1 = new Set(str1.split(''))
    const set2 = new Set(str2.split(''))
    
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    
    return intersection.size / union.size
  }
  
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null)
    )
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        )
      }
    }
    
    return matrix[str2.length][str1.length]
  }
  
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      // ひらがな・カタカナの正規化
      .replace(/[ァ-ヶ]/g, (match) => {
        return String.fromCharCode(match.charCodeAt(0) - 0x60)
      })
      // 全角英数字を半角に変換
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (match) => {
        return String.fromCharCode(match.charCodeAt(0) - 0xFEE0)
      })
      // 空白文字を統一
      .replace(/\s+/g, '')
  }
}

// 信頼度に基づく応答戦略
export class ResponseStrategy {
  static determineResponse(
    matchResult: MatchResult | null,
    matcher: KeywordMatcher
  ): {
    type: 'direct' | 'confirmation' | 'choices' | 'fallback'
    data?: unknown
  } {
    if (!matchResult) {
      return { type: 'fallback' }
    }
    
    const confidenceLevel = matcher.getConfidenceLevel(matchResult.confidence)
    
    switch (confidenceLevel) {
      case 'high':
        return {
          type: 'direct',
          data: { choice: matchResult.choice, confidence: matchResult.confidence }
        }
      
      case 'medium':
        return {
          type: 'confirmation',
          data: { 
            choice: matchResult.choice, 
            confidence: matchResult.confidence,
            matchedKeywords: matchResult.matchedKeywords
          }
        }
      
      case 'low':
        return {
          type: 'choices',
          data: { originalInput: matchResult, confidence: matchResult.confidence }
        }
      
      default:
        return { type: 'fallback' }
    }
  }
}