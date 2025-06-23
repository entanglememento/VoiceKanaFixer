'use client'

import { useState, useRef, useEffect } from 'react'
import { Language, OptimizedChatFlow, ChatNode } from '@/types'

interface FlowVisualizationProps {
  flowData: OptimizedChatFlow
  language: Language
  onNodeSelect?: (nodeId: string) => void
  selectedNode?: string
}

interface NodePosition {
  x: number
  y: number
  id: string
  level: number
}

interface Connection {
  from: string
  to: string
  label?: string
  type: 'next' | 'choice' | 'conditional'
}

export default function FlowVisualization({
  flowData,
  language,
  onNodeSelect,
  selectedNode
}: FlowVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [positions, setPositions] = useState<Map<string, NodePosition>>(new Map())
  const [connections, setConnections] = useState<Connection[]>([])
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1000, height: 600 })

  const getCurrentNodes = (): Record<string, ChatNode> => {
    return flowData.languages[language]?.nodes || {}
  }

  // フローの構造を解析してノードの位置と接続を計算
  useEffect(() => {
    const nodes = getCurrentNodes()
    const nodeIds = Object.keys(nodes)
    
    if (nodeIds.length === 0) return

    // ノードの階層構造を分析
    const levels = new Map<string, number>()
    const visited = new Set<string>()
    const connections: Connection[] = []

    // 開始ノードを見つける（通常は'start'または最初のノード）
    const startNode = nodeIds.find(id => id === 'start') || nodeIds[0]
    
    // BFSでレベルを計算
    const queue: Array<{ id: string, level: number }> = [{ id: startNode, level: 0 }]
    levels.set(startNode, 0)

    while (queue.length > 0) {
      const { id: currentId, level } = queue.shift()!
      
      if (visited.has(currentId)) continue
      visited.add(currentId)

      const node = nodes[currentId]
      if (!node) continue

      // 次のノードへの接続
      if (node.next) {
        connections.push({
          from: currentId,
          to: node.next,
          type: 'next'
        })

        if (!levels.has(node.next)) {
          levels.set(node.next, level + 1)
          queue.push({ id: node.next, level: level + 1 })
        }
      }

      // 選択肢からの接続
      if (node.choices) {
        node.choices.forEach((choice) => {
          connections.push({
            from: currentId,
            to: choice.next,
            label: choice.text,
            type: 'choice'
          })

          if (!levels.has(choice.next)) {
            levels.set(choice.next, level + 1)
            queue.push({ id: choice.next, level: level + 1 })
          }
        })
      }
    }

    // レベルごとにノードをグループ化
    const nodesByLevel = new Map<number, string[]>()
    levels.forEach((level, nodeId) => {
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, [])
      }
      nodesByLevel.get(level)!.push(nodeId)
    })

    // 孤立したノードも追加
    nodeIds.forEach(id => {
      if (!levels.has(id)) {
        const maxLevel = Math.max(...Array.from(levels.values()), -1) + 1
        levels.set(id, maxLevel)
        if (!nodesByLevel.has(maxLevel)) {
          nodesByLevel.set(maxLevel, [])
        }
        nodesByLevel.get(maxLevel)!.push(id)
      }
    })

    // 位置を計算
    const nodePositions = new Map<string, NodePosition>()
    const nodeWidth = 180
    const levelHeight = 150
    const nodeSpacing = 200

    let maxWidth = 0

    nodesByLevel.forEach((nodesInLevel, level) => {
      const y = level * levelHeight + 50
      const totalWidth = (nodesInLevel.length - 1) * nodeSpacing
      const startX = -totalWidth / 2

      nodesInLevel.forEach((nodeId, index) => {
        const x = startX + index * nodeSpacing
        nodePositions.set(nodeId, {
          x,
          y,
          id: nodeId,
          level
        })

        maxWidth = Math.max(maxWidth, Math.abs(x) + nodeWidth / 2)
      })
    })

    const maxHeight = Math.max(...Array.from(levels.values())) * levelHeight + 150

    setPositions(nodePositions)
    setConnections(connections)
    setViewBox({
      x: -maxWidth - 100,
      y: -50,
      width: (maxWidth + 100) * 2,
      height: maxHeight
    })
  }, [flowData, language])

  const getNodeColor = (node: ChatNode): string => {
    switch (node.type) {
      case 'message': return '#10B981' // green
      case 'choice': return '#3B82F6'  // blue
      case 'input': return '#F59E0B'   // yellow
      case 'confirmation': return '#8B5CF6' // purple
      default: return '#6B7280'        // gray
    }
  }

  const getNodeTypeLabel = (type: string): string => {
    switch (type) {
      case 'message': return 'メッセージ'
      case 'choice': return '選択肢'
      case 'input': return '入力'
      case 'confirmation': return '確認'
      default: return type
    }
  }

  const handleNodeClick = (nodeId: string) => {
    onNodeSelect?.(nodeId)
  }

  const nodes = getCurrentNodes()

  return (
    <div className="w-full h-96 border border-gray-300 rounded-lg bg-white overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">
          チャットフロー構造図 ({language === 'ja' ? '日本語' : '英語'})
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          ノードをクリックすると詳細を確認できます
        </p>
      </div>

      <div className="relative w-full h-full overflow-auto">
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          className="w-full h-full"
          style={{ minWidth: '800px', minHeight: '600px' }}
        >
          {/* 接続線 */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#6B7280"
              />
            </marker>
          </defs>

          {connections.map((connection, index) => {
            const fromPos = positions.get(connection.from)
            const toPos = positions.get(connection.to)
            
            if (!fromPos || !toPos) return null

            const fromX = fromPos.x
            const fromY = fromPos.y + 50 // ノードの下端
            const toX = toPos.x
            const toY = toPos.y - 50 // ノードの上端

            // 接続線の色
            const strokeColor = connection.type === 'choice' ? '#3B82F6' : '#6B7280'
            const strokeWidth = connection.type === 'choice' ? 2 : 1.5

            return (
              <g key={`connection-${index}`}>
                {/* 接続線 */}
                <path
                  d={`M ${fromX} ${fromY} Q ${fromX} ${(fromY + toY) / 2} ${toX} ${toY}`}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  fill="none"
                  markerEnd="url(#arrowhead)"
                />
                
                {/* ラベル */}
                {connection.label && (
                  <text
                    x={(fromX + toX) / 2}
                    y={(fromY + toY) / 2}
                    textAnchor="middle"
                    className="text-xs fill-gray-600"
                    style={{ fontSize: '11px' }}
                  >
                    {connection.label.length > 10 
                      ? connection.label.substring(0, 10) + '...' 
                      : connection.label
                    }
                  </text>
                )}
              </g>
            )
          })}

          {/* ノード */}
          {Array.from(positions.entries()).map(([nodeId, position]) => {
            const node = nodes[nodeId]
            if (!node) return null

            const isSelected = selectedNode === nodeId
            const nodeColor = getNodeColor(node)

            return (
              <g
                key={nodeId}
                transform={`translate(${position.x - 80}, ${position.y - 40})`}
                className="cursor-pointer"
                onClick={() => handleNodeClick(nodeId)}
              >
                {/* ノードの背景 */}
                <rect
                  width="160"
                  height="80"
                  rx="8"
                  fill={isSelected ? nodeColor : 'white'}
                  stroke={nodeColor}
                  strokeWidth={isSelected ? 3 : 2}
                  className="drop-shadow-sm"
                />

                {/* ノードID */}
                <text
                  x="80"
                  y="20"
                  textAnchor="middle"
                  className={`text-sm font-semibold ${isSelected ? 'fill-white' : 'fill-gray-900'}`}
                  style={{ fontSize: '12px' }}
                >
                  {nodeId.length > 12 ? nodeId.substring(0, 12) + '...' : nodeId}
                </text>

                {/* ノードタイプ */}
                <text
                  x="80"
                  y="35"
                  textAnchor="middle"
                  className={`text-xs ${isSelected ? 'fill-white' : 'fill-gray-600'}`}
                  style={{ fontSize: '10px' }}
                >
                  {getNodeTypeLabel(node.type)}
                </text>

                {/* コンテンツプレビュー */}
                <text
                  x="80"
                  y="50"
                  textAnchor="middle"
                  className={`text-xs ${isSelected ? 'fill-white' : 'fill-gray-500'}`}
                  style={{ fontSize: '9px' }}
                >
                  {node.content.length > 15 
                    ? node.content.substring(0, 15) + '...'
                    : node.content
                  }
                </text>

                {/* 選択肢数の表示 */}
                {node.choices && node.choices.length > 0 && (
                  <text
                    x="80"
                    y="65"
                    textAnchor="middle"
                    className={`text-xs ${isSelected ? 'fill-white' : 'fill-gray-400'}`}
                    style={{ fontSize: '9px' }}
                  >
                    選択肢: {node.choices.length}個
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* 凡例 */}
      <div className="p-3 border-t bg-gray-50">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span>メッセージ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span>選択肢</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500"></div>
            <span>入力</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-500"></div>
            <span>確認</span>
          </div>
        </div>
      </div>
    </div>
  )
}