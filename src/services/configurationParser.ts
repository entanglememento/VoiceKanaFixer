import { OriginalConfiguration, OptimizedChatFlow, ChatNode, Choice, Language, LanguageConfig } from '@/types'
import { TranslationService } from './translationService'

export interface ParsedFlowNode {
  id: string
  title: string
  type: 'choice' | 'input' | 'confirmation' | 'message'
  content: string
  choices?: Choice[]
  field?: string
  label?: string
  keywords?: string[]
  next?: string
}

export interface ConversionOptions {
  enableTranslation: boolean
  translationService?: TranslationService
  targetLanguages: Language[]
  generateKeywords: boolean
}

export class ConfigurationParser {
  private codes: Map<string, Array<{label: string, value: string}>> = new Map()
  
  constructor(private config: OriginalConfiguration) {
    this.initializeCodes()
  }
  
  private initializeCodes() {
    this.config.codedef.codes.forEach(code => {
      this.codes.set(code.codeid, code.items)
    })
  }
  
  async convertToOptimizedFlow(options: ConversionOptions): Promise<OptimizedChatFlow> {
    const result: OptimizedChatFlow = {
      version: '1.0',
      storeName: '銀行ATMサービス',
      languages: {} as Record<Language, LanguageConfig>
    }
    
    // 日本語版を最初に作成
    const wfmanager = this.config.wfmanager as Record<string, unknown>
    const domainWorkFlows = (wfmanager?.domainWorkFlows || wfmanager?.domainWorkflows) as Record<string, unknown>[]
    const rootWorkflow = domainWorkFlows?.[0]?.rootWorkflow || domainWorkFlows?.[0]?.rootWorkFlow
    const workflow = (rootWorkflow as Record<string, unknown>)?.workflow || (rootWorkflow as Record<string, unknown>)?.workFlow
    const jaNodes = await this.parseWorkflowToNodes(
      workflow as unknown as Record<string, unknown>[]
    )
    
    result.languages.ja = {
      languageSelection: true,
      settings: {
        autoStopSeconds: 3,
        voiceSpeed: 1.0,
        qrPassword: '1234',
        qrExpiryMinutes: 30
      },
      nodes: jaNodes
    }
    
    // 翻訳が有効な場合、他の言語版を生成
    if (options.enableTranslation && options.translationService) {
      for (const targetLang of options.targetLanguages) {
        if (targetLang === 'ja') continue
        
        const translatedNodes = await this.translateNodes(
          jaNodes,
          'ja',
          targetLang,
          options.translationService
        )
        
        result.languages[targetLang] = {
          languageSelection: true,
          settings: {
            autoStopSeconds: 3,
            voiceSpeed: 1.0,
            qrPassword: '1234',
            qrExpiryMinutes: 30
          },
          nodes: translatedNodes
        }
      }
    }
    
    return result
  }
  
  private async parseWorkflowToNodes(
    workflow: Record<string, unknown>[]
  ): Promise<Record<string, ChatNode>> {
    const nodes: Record<string, ChatNode> = {}
    
    // スタートノードを追加
    nodes.start = {
      id: 'start',
      type: 'message',
      content: 'いらっしゃいませ。ATMサービスをご利用いただき、ありがとうございます。',
      next: (workflow[0]?.id as string) || 'end'
    }
    
    for (let i = 0; i < workflow.length; i++) {
      const item = workflow[i]
      const nextItem = workflow[i + 1]
      
      if (item.type === 'G' && item.group) {
        // グループ内のワークフローを処理
        const group = item.group as Record<string, unknown>
        const groupWorkflow = (group.workflow || group.workFlow) as Record<string, unknown>[]
        const groupNodes = await this.parseWorkflowToNodes(groupWorkflow)
        Object.assign(nodes, groupNodes)
      } else if (item.type === 'N' && item.content) {
        // 通常のノードを処理
        const node = await this.parseContentToNode(item, nextItem?.id as string)
        if (node) {
          nodes[node.id] = node
        }
      } else if (item.type === 'S' && item.branches) {
        // 分岐処理
        const branchNodes = await this.parseBranchesToNodes(item)
        Object.assign(nodes, branchNodes)
      }
    }
    
    // 終了ノードを追加
    nodes.end = {
      id: 'end',
      type: 'message',
      content: 'お取引ありがとうございました。またのご利用をお待ちしております。'
    }
    
    return nodes
  }
  
  private async parseContentToNode(
    item: Record<string, unknown>, 
    nextId: string | undefined
  ): Promise<ChatNode | null> {
    const content = item.content
    if (!content) return null
    
    const node: ChatNode = {
      id: item.id as string,
      type: 'message',
      content: (content as Record<string, unknown>).navText as string || (item.title as string) || '',
      next: nextId
    }
    
    // カスタマイズデータからフィールドタイプを判定
    const contentData = content as Record<string, unknown>
    const customizedData = contentData.customizedData as Record<string, unknown>
    if (customizedData?.items) {
      const firstItem = (customizedData.items as Record<string, unknown>[])[0]
      
      if (firstItem.type === 'CodeButtonField' || firstItem.type === 'CodeButtonFeild') {
        // コードボタンフィールド → 選択肢ノード
        node.type = 'choice'
        const codeId = (firstItem.codeId || firstItem.codeid) as string
        node.choices = this.generateChoicesFromCode(codeId, nextId)
      } else if (firstItem.type === 'FormInputTextField') {
        // 入力フィールド → 入力ノード
        node.type = 'input'
        node.field = firstItem.field as string
        node.label = firstItem.label as string
      } else if (firstItem.type === 'DomainDataWithLabelDisplayField' || firstItem.type === 'DomainDataWithLabelDisplayFeild') {
        // 表示フィールド → 確認ノード
        node.type = 'confirmation'
        node.field = firstItem.field as string
        node.label = firstItem.label as string
      }
    }
    
    return node
  }
  
  private generateChoicesFromCode(codeId: string, nextId?: string): Choice[] {
    const codeItems = this.codes.get(codeId) || []
    
    return codeItems.map(item => ({
      id: item.value,
      text: item.label,
      keywords: this.generateKeywordsForChoice(item.label),
      excludeKeywords: [],
      next: nextId || 'end'
    }))
  }
  
  private generateKeywordsForChoice(label: string): string[] {
    const keywords: string[] = [label]
    
    // 銀行・ATM関連のキーワード拡張
    const keywordMap: {[key: string]: string[]} = {
      '預入': ['入金', '預金', 'お預け入れ', 'よにゅう'],
      '払出': ['出金', '引き出し', '払い出し', 'ひきだし'],
      '振込': ['送金', '振り込み', 'ふりこみ', '送る'],
      '日本語': ['にほんご', 'Japanese', 'jp'],
      'English': ['英語', 'えいご', 'en'],
      '中文': ['中国語', 'Chinese', 'zh'],
      '運転免許証': ['免許証', '免許', 'めんきょ'],
      'パスポート': ['旅券', 'りょけん'],
      '個人番号カード': ['マイナンバーカード', 'マイナンバー'],
      '健康保険証': ['保険証', 'ほけんしょう'],
      '通帳': ['つうちょう', 'bankbook']
    }
    
    if (keywordMap[label]) {
      keywords.push(...keywordMap[label])
    }
    
    return keywords
  }
  
  private async parseBranchesToNodes(
    branchItem: Record<string, unknown>
  ): Promise<Record<string, ChatNode>> {
    const nodes: Record<string, ChatNode> = {}
    
    const branches = branchItem.branches as Record<string, unknown>[]
    for (const branch of branches) {
      const branchWorkflow = (branch.workflow || branch.workFlow) as Record<string, unknown>[]
      if (branchWorkflow) {
        const branchNodes = await this.parseWorkflowToNodes(branchWorkflow)
        Object.assign(nodes, branchNodes)
      }
    }
    
    return nodes
  }
  
  private async translateNodes(
    nodes: Record<string, ChatNode>,
    fromLang: Language,
    toLang: Language,
    translationService: TranslationService
  ): Promise<Record<string, ChatNode>> {
    const translatedNodes: Record<string, ChatNode> = {}
    
    for (const [nodeId, node] of Object.entries(nodes)) {
      const translatedNode: ChatNode = { ...node }
      
      // コンテンツを翻訳
      const contentResult = await translationService.translateText(
        node.content,
        fromLang,
        toLang
      )
      
      translatedNode.content = contentResult
      
      // ラベルを翻訳
      if (node.label) {
        const labelResult = await translationService.translateText(
          node.label,
          fromLang,
          toLang
        )
        
        translatedNode.label = labelResult
      }
      
      // 選択肢を翻訳
      if (node.choices) {
        translatedNode.choices = await this.translateChoices(
          node.choices,
          fromLang,
          toLang,
          translationService
        )
      }
      
      translatedNodes[nodeId] = translatedNode
      
      // API制限対策で少し待機
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    return translatedNodes
  }
  
  private async translateChoices(
    choices: Choice[],
    fromLang: Language,
    toLang: Language,
    translationService: TranslationService
  ): Promise<Choice[]> {
    const translatedChoices: Choice[] = []
    
    for (const choice of choices) {
      const translatedChoice: Choice = { ...choice }
      
      // 選択肢テキストを翻訳
      const textResult = await translationService.translateText(
        choice.text,
        fromLang,
        toLang
      )
      
      translatedChoice.text = textResult
      
      // キーワードを翻訳
      if (choice.keywords) {
        const translatedKeywords: string[] = []
        for (const keyword of choice.keywords) {
          const keywordResult = await translationService.translateText(
            keyword,
            fromLang,
            toLang
          )
          
          translatedKeywords.push(keywordResult)
        }
        translatedChoice.keywords = translatedKeywords
      }
      
      translatedChoices.push(translatedChoice)
      
      // API制限対策
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    
    return translatedChoices
  }
}