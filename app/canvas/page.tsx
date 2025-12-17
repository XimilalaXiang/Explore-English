"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  Panel,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme-toggle"
import { BookOpen, Search, Trash2, RotateCcw, Download, Home, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import WordNode from "@/components/canvas/word-node"

// 自定义节点类型
const nodeTypes = {
  word: WordNode,
}

// 边样式
const edgeStyles = {
  semantic: {
    stroke: "#3b82f6", // 蓝色
    strokeWidth: 2,
  },
  visual: {
    stroke: "#f97316", // 橙色
    strokeWidth: 2,
    strokeDasharray: "5,5", // 虚线
  },
}

interface WordData {
  word: string
  definition?: string
  similarity?: string
  expanded: boolean
  loading?: boolean
}

interface CanvasState {
  nodes: Node<WordData>[]
  edges: Edge[]
  viewport: { x: number; y: number; zoom: number }
}

// 保存画布状态到 localStorage
const saveCanvasState = (nodes: Node<WordData>[], edges: Edge[], viewport: { x: number; y: number; zoom: number }) => {
  const state: CanvasState = { nodes, edges, viewport }
  localStorage.setItem("canvasState", JSON.stringify(state))
}

// 从 localStorage 加载画布状态
const loadCanvasState = (): CanvasState | null => {
  const saved = localStorage.getItem("canvasState")
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return null
    }
  }
  return null
}

function CanvasContent() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<WordData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [inputWord, setInputWord] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const reactFlowInstance = useReactFlow()
  const initialized = useRef(false)

  // 加载保存的画布状态
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const savedState = loadCanvasState()
    if (savedState && savedState.nodes.length > 0) {
      setNodes(savedState.nodes)
      setEdges(savedState.edges)
      // 延迟设置视口，等待 ReactFlow 初始化
      setTimeout(() => {
        reactFlowInstance.setViewport(savedState.viewport)
      }, 100)
      toast.success("已恢复上次的画布")
    }
  }, [setNodes, setEdges, reactFlowInstance])

  // 自动保存画布状态
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      const viewport = reactFlowInstance.getViewport()
      saveCanvasState(nodes, edges, viewport)
    }
  }, [nodes, edges, reactFlowInstance])

  // 生成节点 ID（使用小写单词作为唯一标识）
  const getNodeId = (word: string) => word.toLowerCase().trim()

  // 检查节点是否已存在
  const nodeExists = useCallback((word: string) => {
    return nodes.some((n) => n.id === getNodeId(word))
  }, [nodes])

  // 检查边是否已存在
  const edgeExists = useCallback((source: string, target: string, type: string) => {
    const edgeId = `${source}-${target}-${type}`
    const reverseEdgeId = `${target}-${source}-${type}`
    return edges.some((e) => e.id === edgeId || e.id === reverseEdgeId)
  }, [edges])

  // 计算新节点的位置（围绕父节点）
  const calculateNodePosition = (parentNode: Node<WordData>, index: number, total: number) => {
    const radius = 200
    const angle = (2 * Math.PI * index) / total - Math.PI / 2
    return {
      x: parentNode.position.x + radius * Math.cos(angle),
      y: parentNode.position.y + radius * Math.sin(angle),
    }
  }

  // 调用 API 获取相关单词
  const fetchRelatedWords = async (word: string) => {
    const settings = localStorage.getItem("apiSettings")
    if (!settings) {
      toast.error("请先配置 API 设置", {
        action: {
          label: "去设置",
          onClick: () => window.location.href = "/settings",
        },
      })
      return null
    }

    const parsedSettings = JSON.parse(settings)
    if (!parsedSettings.apiKey) {
      toast.error("请先配置 API Key")
      return null
    }

    const headers: HeadersInit = { "Content-Type": "application/json" }
    headers["x-api-settings"] = settings

    const response = await fetch("/api/find-words", {
      method: "POST",
      headers,
      body: JSON.stringify({ word }),
    })

    if (!response.ok) {
      throw new Error("API 请求失败")
    }

    return response.json()
  }

  // 展开节点（获取相关单词并创建新节点/边）
  const expandNode = useCallback(async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node || node.data.expanded || node.data.loading) return

    // 设置加载状态
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, loading: true } } : n
      )
    )

    try {
      const data = await fetchRelatedWords(node.data.word)
      if (!data) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, loading: false } } : n
          )
        )
        return
      }

      const { semanticWords, similarWords } = data
      const allWords = [
        ...semanticWords.map((w: { word: string; definition: string }) => ({ ...w, type: "semantic" as const })),
        ...similarWords.map((w: { word: string; similarity: string }) => ({ ...w, type: "visual" as const })),
      ]

      const newNodes: Node<WordData>[] = []
      const newEdges: Edge[] = []
      let newNodeIndex = 0
      const totalNewNodes = allWords.filter((w) => !nodeExists(w.word)).length

      allWords.forEach((wordData) => {
        const targetId = getNodeId(wordData.word)
        const edgeType = wordData.type

        if (nodeExists(wordData.word)) {
          // 节点已存在，只添加边（如果边不存在）
          if (!edgeExists(nodeId, targetId, edgeType)) {
            newEdges.push({
              id: `${nodeId}-${targetId}-${edgeType}`,
              source: nodeId,
              target: targetId,
              type: "default",
              style: edgeStyles[edgeType],
              animated: edgeType === "semantic",
            })
          }
        } else {
          // 创建新节点
          const position = calculateNodePosition(node, newNodeIndex, totalNewNodes || 1)
          newNodes.push({
            id: targetId,
            type: "word",
            position,
            data: {
              word: wordData.word,
              definition: wordData.type === "semantic" ? wordData.definition : undefined,
              similarity: wordData.type === "visual" ? wordData.similarity : undefined,
              expanded: false,
            },
          })
          // 添加边
          newEdges.push({
            id: `${nodeId}-${targetId}-${edgeType}`,
            source: nodeId,
            target: targetId,
            type: "default",
            style: edgeStyles[edgeType],
            animated: edgeType === "semantic",
          })
          newNodeIndex++
        }
      })

      // 更新状态
      setNodes((nds) => [
        ...nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, expanded: true, loading: false } } : n
        ),
        ...newNodes,
      ])
      setEdges((eds) => [...eds, ...newEdges])

      toast.success(`展开 "${node.data.word}"，找到 ${allWords.length} 个相关词`)
    } catch (error) {
      console.error("Error expanding node:", error)
      toast.error("展开失败，请重试")
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, loading: false } } : n
        )
      )
    }
  }, [nodes, setNodes, setEdges, nodeExists, edgeExists])

  // 处理节点双击
  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node<WordData>) => {
    expandNode(node.id)
  }, [expandNode])

  // 添加初始单词
  const addInitialWord = async () => {
    const word = inputWord.trim()
    if (!word) {
      toast.warning("请输入单词")
      return
    }

    if (!/^[a-zA-Z-]+$/.test(word)) {
      toast.error("请输入有效的英文单词")
      return
    }

    if (nodeExists(word)) {
      toast.info(`"${word}" 已存在于画布中`)
      // 聚焦到该节点
      const existingNode = nodes.find((n) => n.id === getNodeId(word))
      if (existingNode) {
        reactFlowInstance.setCenter(existingNode.position.x, existingNode.position.y, { zoom: 1, duration: 500 })
      }
      return
    }

    setIsLoading(true)

    try {
      const data = await fetchRelatedWords(word)
      if (!data) {
        setIsLoading(false)
        return
      }

      const { semanticWords, similarWords } = data

      // 创建中心节点
      const centerNode: Node<WordData> = {
        id: getNodeId(word),
        type: "word",
        position: { x: 0, y: 0 },
        data: {
          word,
          expanded: true,
          definition: undefined,
          similarity: undefined,
        },
      }

      // 创建相关单词节点
      const allWords = [
        ...semanticWords.map((w: { word: string; definition: string }) => ({ ...w, type: "semantic" as const })),
        ...similarWords.map((w: { word: string; similarity: string }) => ({ ...w, type: "visual" as const })),
      ]

      const newNodes: Node<WordData>[] = [centerNode]
      const newEdges: Edge[] = []

      allWords.forEach((wordData, index) => {
        const targetId = getNodeId(wordData.word)
        
        if (!nodeExists(wordData.word) && targetId !== getNodeId(word)) {
          const angle = (2 * Math.PI * index) / allWords.length - Math.PI / 2
          const radius = 200
          const position = {
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle),
          }

          newNodes.push({
            id: targetId,
            type: "word",
            position,
            data: {
              word: wordData.word,
              definition: wordData.type === "semantic" ? wordData.definition : undefined,
              similarity: wordData.type === "visual" ? wordData.similarity : undefined,
              expanded: false,
            },
          })

          newEdges.push({
            id: `${getNodeId(word)}-${targetId}-${wordData.type}`,
            source: getNodeId(word),
            target: targetId,
            type: "default",
            style: edgeStyles[wordData.type],
            animated: wordData.type === "semantic",
          })
        }
      })

      setNodes((nds) => [...nds, ...newNodes])
      setEdges((eds) => [...eds, ...newEdges])
      setInputWord("")

      // 居中显示
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 500 })
      }, 100)

      toast.success(`已添加 "${word}" 及其 ${allWords.length} 个相关词`)
    } catch (error) {
      console.error("Error adding word:", error)
      toast.error("添加失败，请重试")
    } finally {
      setIsLoading(false)
    }
  }

  // 清空画布
  const clearCanvas = () => {
    setNodes([])
    setEdges([])
    localStorage.removeItem("canvasState")
    toast.success("画布已清空")
  }

  // 重置视图
  const resetView = () => {
    reactFlowInstance.fitView({ padding: 0.2, duration: 500 })
  }

  // 导出画布为 JSON
  const exportCanvas = () => {
    const state: CanvasState = {
      nodes,
      edges,
      viewport: reactFlowInstance.getViewport(),
    }
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `word-canvas-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("画布已导出")
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* 导航栏 */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <BookOpen className="h-5 w-5 text-foreground" />
              <span className="text-sm font-medium text-foreground">Awesome English</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium text-foreground">画布模式</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/">
              <Button variant="ghost" size="sm" className="h-8 gap-2">
                <Home className="h-4 w-4" />
                <span className="text-sm">首页</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 画布区域 */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDoubleClick={onNodeDoubleClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{
            type: "default",
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls />

          {/* 输入面板 */}
          <Panel position="top-center" className="mt-4">
            <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm p-3 rounded-2xl shadow-lg border border-border/60">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="输入英文单词，按回车添加"
                  value={inputWord}
                  onChange={(e) => setInputWord(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isLoading && addInitialWord()}
                  disabled={isLoading}
                  className="w-64 h-10 pl-9 pr-4 rounded-xl"
                />
              </div>
              <Button
                onClick={addInitialWord}
                disabled={isLoading}
                className="h-10 px-4 rounded-xl"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "添加"}
              </Button>
            </div>
          </Panel>

          {/* 工具栏 */}
          <Panel position="bottom-center" className="mb-4">
            <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-border/60">
              <Button variant="ghost" size="sm" onClick={resetView} className="h-8 gap-2">
                <RotateCcw className="h-4 w-4" />
                <span className="text-sm">重置视图</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={exportCanvas} className="h-8 gap-2">
                <Download className="h-4 w-4" />
                <span className="text-sm">导出</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={clearCanvas} className="h-8 gap-2 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
                <span className="text-sm">清空</span>
              </Button>
            </div>
          </Panel>

          {/* 图例 */}
          <Panel position="bottom-left" className="mb-4 ml-4">
            <div className="bg-background/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-border/60 text-sm">
              <div className="font-medium mb-2 text-foreground">图例</div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-0.5 bg-blue-500"></div>
                <span className="text-muted-foreground">语义相似</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-orange-500" style={{ backgroundImage: "repeating-linear-gradient(90deg, #f97316 0, #f97316 4px, transparent 4px, transparent 8px)" }}></div>
                <span className="text-muted-foreground">拼写相似</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                双击节点展开相关词
              </div>
            </div>
          </Panel>

          {/* 空状态提示 */}
          {nodes.length === 0 && (
            <Panel position="top-center" className="mt-32">
              <div className="text-center text-muted-foreground">
                <p className="text-lg mb-2">画布是空的</p>
                <p className="text-sm">在上方输入框输入英文单词开始探索</p>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  )
}

export default function CanvasPage() {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  )
}

