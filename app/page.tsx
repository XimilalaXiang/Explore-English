"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { BookOpen, Search, Settings, History, Sparkles, Type, X, Copy, Check } from "lucide-react"
import Link from "next/link"

interface SearchResult {
  word: string
  semanticWords: Array<{ word: string; definition: string }>
  similarWords: Array<{ word: string; similarity: string }>
  timestamp: number
}

export default function HomePage() {
  const [word, setWord] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<SearchResult[]>([])
  const [copiedSection, setCopiedSection] = useState<"semantic" | "similar" | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem("searchHistory")
    if (saved) {
      setHistory(JSON.parse(saved))
    }
  }, [])

  const resetToHome = () => {
    setResults(null)
    setWord("")
    setShowHistory(false)
  }

  const handleSearch = async (searchWord?: string) => {
    const targetWord = searchWord || word.trim()
    if (!targetWord) return

    setLoading(true)
    setShowHistory(false)

    try {
      const settings = localStorage.getItem("apiSettings")
      const headers: HeadersInit = { "Content-Type": "application/json" }

      if (settings) {
        headers["x-api-settings"] = settings
      }

      const response = await fetch("/api/find-words", {
        method: "POST",
        headers,
        body: JSON.stringify({ word: targetWord }),
      })

      const data = await response.json()
      const result = { ...data, word: targetWord, timestamp: Date.now() }
      setResults(result)

      const newHistory = [result, ...history.filter((h) => h.word !== targetWord)]
      setHistory(newHistory)
      localStorage.setItem("searchHistory", JSON.stringify(newHistory))
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem("searchHistory")
    setShowHistory(false)
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
    } catch (error) {
      console.error("Failed to copy:", error)
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
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="h-8 gap-2">
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
        {!results && !showHistory && (
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

        {showHistory && history.length > 0 && !loading && (
          <Card className="mb-8 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">搜索历史</h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={clearHistory} className="text-muted-foreground">
                  清空
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              {history.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setWord(item.word)
                    handleSearch(item.word)
                  }}
                  className="text-left px-4 py-3 rounded-xl hover:bg-accent transition-colors"
                >
                  <div className="font-medium text-foreground">{item.word}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(item.timestamp).toLocaleDateString("zh-CN")}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {results && !showHistory && !loading && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-semibold text-foreground mb-2">{results.word}</h2>
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
                    <div key={index} className="p-4 rounded-xl bg-accent/50">
                      <div className="font-medium text-foreground mb-1">{item.word}</div>
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
                    <div key={index} className="p-4 rounded-xl bg-accent/50">
                      <div className="font-medium text-foreground mb-1">{item.word}</div>
                      <div className="text-sm text-muted-foreground leading-relaxed">{item.similarity}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {!results && !showHistory && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">输入单词开始探索</p>
          </div>
        )}
      </main>
    </div>
  )
}
