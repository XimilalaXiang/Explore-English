"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { BookOpen, Search, Settings, History, Sparkles, Type, X, Copy, Check, Volume2, Star, StarOff, Heart } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface SearchResult {
  word: string
  semanticWords: Array<{ word: string; definition: string }>
  similarWords: Array<{ word: string; similarity: string }>
  timestamp: number
}

interface FavoriteWord {
  word: string
  addedAt: number
}

export default function HomePage() {
  const [word, setWord] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [history, setHistory] = useState<SearchResult[]>([])
  const [favorites, setFavorites] = useState<FavoriteWord[]>([])
  const [copiedSection, setCopiedSection] = useState<"semantic" | "similar" | null>(null)
  const [speakingWord, setSpeakingWord] = useState<string | null>(null)

  // 加载历史记录和收藏夹
  useEffect(() => {
    const savedHistory = localStorage.getItem("searchHistory")
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory))
      } catch {
        console.error("Failed to parse search history")
      }
    }

    const savedFavorites = localStorage.getItem("favorites")
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites))
      } catch {
        console.error("Failed to parse favorites")
      }
    }
  }, [])

  // 检查单词是否已收藏
  const isFavorite = useCallback((wordToCheck: string) => {
    return favorites.some(f => f.word.toLowerCase() === wordToCheck.toLowerCase())
  }, [favorites])

  // 切换收藏状态
  const toggleFavorite = useCallback((wordToToggle: string) => {
    const isCurrentlyFavorite = isFavorite(wordToToggle)
    
    let newFavorites: FavoriteWord[]
    if (isCurrentlyFavorite) {
      newFavorites = favorites.filter(f => f.word.toLowerCase() !== wordToToggle.toLowerCase())
      toast.success(`已取消收藏 "${wordToToggle}"`)
    } else {
      newFavorites = [{ word: wordToToggle, addedAt: Date.now() }, ...favorites]
      toast.success(`已收藏 "${wordToToggle}"`, {
        icon: <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />,
      })
    }
    
    setFavorites(newFavorites)
    localStorage.setItem("favorites", JSON.stringify(newFavorites))
  }, [favorites, isFavorite])

  // 发音功能
  const speakWord = useCallback((wordToSpeak: string, accent: 'en-US' | 'en-GB' = 'en-US') => {
    if (!('speechSynthesis' in window)) {
      toast.error("您的浏览器不支持语音合成功能")
      return
    }

    // 取消正在进行的语音
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(wordToSpeak)
    utterance.lang = accent
    utterance.rate = 0.9
    utterance.pitch = 1

    utterance.onstart = () => setSpeakingWord(wordToSpeak)
    utterance.onend = () => setSpeakingWord(null)
    utterance.onerror = () => {
      setSpeakingWord(null)
      toast.error("发音失败，请重试")
    }

    window.speechSynthesis.speak(utterance)
  }, [])

  const resetToHome = () => {
    setResults(null)
    setWord("")
    setShowHistory(false)
    setShowFavorites(false)
  }

  const handleSearch = async (searchWord?: string) => {
    const targetWord = (searchWord || word).trim()
    
    // 输入验证
    if (!targetWord) {
      toast.warning("请输入要查询的单词")
      return
    }

    // 验证是否为有效的英文单词（只允许字母和连字符）
    if (!/^[a-zA-Z-]+$/.test(targetWord)) {
      toast.error("请输入有效的英文单词（仅支持字母和连字符）")
      return
    }

    // 检查 API 设置
    const settings = localStorage.getItem("apiSettings")
    if (!settings) {
      toast.error("请先配置 API 设置", {
        action: {
          label: "去设置",
          onClick: () => window.location.href = "/settings",
        },
      })
      return
    }

    const parsedSettings = JSON.parse(settings)
    if (!parsedSettings.apiKey) {
      toast.error("请先配置 API Key", {
        action: {
          label: "去设置",
          onClick: () => window.location.href = "/settings",
        },
      })
      return
    }

    setLoading(true)
    setShowHistory(false)
    setShowFavorites(false)

    try {
      const headers: HeadersInit = { "Content-Type": "application/json" }
      headers["x-api-settings"] = settings

      const response = await fetch("/api/find-words", {
        method: "POST",
        headers,
        body: JSON.stringify({ word: targetWord }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `请求失败 (${response.status})`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const result = { ...data, word: targetWord, timestamp: Date.now() }
      setResults(result)

      // 更新历史记录（无限制）
      const newHistory = [result, ...history.filter((h) => h.word.toLowerCase() !== targetWord.toLowerCase())]
      setHistory(newHistory)
      localStorage.setItem("searchHistory", JSON.stringify(newHistory))

      toast.success(`找到 "${targetWord}" 的相关单词`)
    } catch (error) {
      console.error("Search error:", error)
      const errorMessage = error instanceof Error ? error.message : "查询失败，请稍后重试"
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem("searchHistory")
    setShowHistory(false)
    toast.success("搜索历史已清空")
  }

  const clearFavorites = () => {
    setFavorites([])
    localStorage.removeItem("favorites")
    setShowFavorites(false)
    toast.success("收藏夹已清空")
  }

  const removeFavorite = (wordToRemove: string) => {
    const newFavorites = favorites.filter(f => f.word !== wordToRemove)
    setFavorites(newFavorites)
    localStorage.setItem("favorites", JSON.stringify(newFavorites))
    toast.success(`已取消收藏 "${wordToRemove}"`)
  }

  const copyToClipboard = async (type: "semantic" | "similar") => {
    if (!results) return

    const words =
      type === "semantic" ? results.semanticWords.map((w) => w.word) : results.similarWords.map((w) => w.word)

    const title = type === "semantic" ? "意思相似" : "拼写相似"
    const text = `${title}\n${words.join("\n")}`

    try {
      await navigator.clipboard.writeText(text)
      setCopiedSection(type)
      setTimeout(() => setCopiedSection(null), 2000)
      toast.success("已复制到剪贴板")
    } catch {
      toast.error("复制失败，请手动复制")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={resetToHome} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <BookOpen className="h-5 w-5 text-foreground" />
            <span className="text-sm font-medium text-foreground">Awesome English</span>
          </button>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setShowFavorites(!showFavorites); setShowHistory(false) }} 
              className={`h-8 gap-2 ${showFavorites ? 'bg-accent' : ''}`}
            >
              <Heart className={`h-4 w-4 ${favorites.length > 0 ? 'text-red-500 fill-red-500' : ''}`} />
              <span className="text-sm">收藏</span>
              {favorites.length > 0 && (
                <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {favorites.length}
                </span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setShowHistory(!showHistory); setShowFavorites(false) }} 
              className={`h-8 gap-2 ${showHistory ? 'bg-accent' : ''}`}
            >
              <History className="h-4 w-4" />
              <span className="text-sm">历史</span>
            </Button>
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="h-8 gap-2">
                <Settings className="h-4 w-4" />
                <span className="text-sm">设置</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-5xl">
        {!results && !showHistory && !showFavorites && (
          <div className="text-center mb-16 mt-20">
            <h1 className="text-6xl font-semibold text-foreground mb-4 tracking-tight">Awesome English</h1>
            <p className="text-xl text-muted-foreground text-pretty">智能探索英文单词的意义与形态</p>
          </div>
        )}

        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="输入英文单词"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              disabled={loading}
              className="h-14 pl-12 pr-4 text-lg rounded-2xl border-border/60 bg-card shadow-sm focus:shadow-md transition-shadow disabled:opacity-60"
            />
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-muted animate-pulse" />
              <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground animate-pulse">正在分析单词...</p>
          </div>
        )}

        {/* 收藏夹面板 */}
        {showFavorites && !loading && (
          <Card className="mb-8 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                我的收藏
              </h2>
              <div className="flex gap-2">
                {favorites.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFavorites} className="text-muted-foreground">
                    清空
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setShowFavorites(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {favorites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>还没有收藏任何单词</p>
                <p className="text-sm mt-1">搜索单词后点击星标即可收藏</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {favorites.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-accent transition-colors group"
                  >
                    <button
                      onClick={() => {
                        setWord(item.word)
                        handleSearch(item.word)
                      }}
                      className="flex-1 text-left"
                    >
                      <div className="font-medium text-foreground">{item.word}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(item.addedAt).toLocaleDateString("zh-CN")}
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); speakWord(item.word) }}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Volume2 className={`h-4 w-4 ${speakingWord === item.word ? 'text-primary animate-pulse' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); removeFavorite(item.word) }}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                      >
                        <StarOff className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* 历史记录面板 */}
        {showHistory && !loading && (
          <Card className="mb-8 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">搜索历史</h2>
              <div className="flex gap-2">
                {history.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearHistory} className="text-muted-foreground">
                    清空
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>还没有搜索记录</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {history.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-accent transition-colors group"
                  >
                    <button
                      onClick={() => {
                        setWord(item.word)
                        handleSearch(item.word)
                      }}
                      className="flex-1 text-left"
                    >
                      <div className="font-medium text-foreground">{item.word}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(item.timestamp).toLocaleDateString("zh-CN")}
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); speakWord(item.word) }}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Volume2 className={`h-4 w-4 ${speakingWord === item.word ? 'text-primary animate-pulse' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(item.word) }}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Star className={`h-4 w-4 ${isFavorite(item.word) ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* 搜索结果 */}
        {results && !showHistory && !showFavorites && !loading && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-2">
                <h2 className="text-4xl font-semibold text-foreground">{results.word}</h2>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => speakWord(results.word, 'en-US')}
                    className="h-9 w-9 p-0 rounded-full"
                    title="美式发音"
                  >
                    <Volume2 className={`h-5 w-5 ${speakingWord === results.word ? 'text-primary animate-pulse' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFavorite(results.word)}
                    className="h-9 w-9 p-0 rounded-full"
                    title={isFavorite(results.word) ? "取消收藏" : "添加收藏"}
                  >
                    <Star className={`h-5 w-5 transition-colors ${isFavorite(results.word) ? 'text-yellow-500 fill-yellow-500' : 'hover:text-yellow-500'}`} />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <button 
                  onClick={() => speakWord(results.word, 'en-US')} 
                  className="hover:text-primary transition-colors"
                >
                  🇺🇸 美式
                </button>
                <span>|</span>
                <button 
                  onClick={() => speakWord(results.word, 'en-GB')} 
                  className="hover:text-primary transition-colors"
                >
                  🇬🇧 英式
                </button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-8 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">意思相似</h3>
                      <p className="text-sm text-muted-foreground">Semantic</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard("semantic")} className="h-8 w-8 p-0">
                    {copiedSection === "semantic" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="space-y-3">
                  {results.semanticWords.map((item, index) => (
                    <div key={index} className="p-4 rounded-xl bg-accent/50 group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground">{item.word}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => speakWord(item.word)}
                            className="h-6 w-6 p-0"
                          >
                            <Volume2 className={`h-3.5 w-3.5 ${speakingWord === item.word ? 'text-primary animate-pulse' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFavorite(item.word)}
                            className="h-6 w-6 p-0"
                          >
                            <Star className={`h-3.5 w-3.5 ${isFavorite(item.word) ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground leading-relaxed">{item.definition}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-8 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Type className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">拼写相似</h3>
                      <p className="text-sm text-muted-foreground">Visual</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard("similar")} className="h-8 w-8 p-0">
                    {copiedSection === "similar" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="space-y-3">
                  {results.similarWords.map((item, index) => (
                    <div key={index} className="p-4 rounded-xl bg-accent/50 group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground">{item.word}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => speakWord(item.word)}
                            className="h-6 w-6 p-0"
                          >
                            <Volume2 className={`h-3.5 w-3.5 ${speakingWord === item.word ? 'text-primary animate-pulse' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFavorite(item.word)}
                            className="h-6 w-6 p-0"
                          >
                            <Star className={`h-3.5 w-3.5 ${isFavorite(item.word) ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground leading-relaxed">{item.similarity}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {!results && !showHistory && !showFavorites && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">输入单词开始探索</p>
          </div>
        )}
      </main>
    </div>
  )
}
