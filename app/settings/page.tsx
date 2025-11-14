"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, RefreshCw, Check } from 'lucide-react'
import Link from "next/link"

interface Settings {
  apiUrl: string
  apiKey: string
  selectedModel: string
}

interface Model {
  id: string
  object: string
  created?: number
  owned_by?: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    apiUrl: "",
    apiKey: "",
    selectedModel: "",
  })
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("apiSettings")
    if (saved) {
      setSettings(JSON.parse(saved))
    } else {
      const defaultSettings = {
        apiUrl: "https://api.openai.com/v1",
        apiKey: "",
        selectedModel: "gpt-4o-mini",
      }
      setSettings(defaultSettings)
      localStorage.setItem("apiSettings", JSON.stringify(defaultSettings))
    }
  }, [])

  const fetchModels = async () => {
    if (!settings.apiUrl || !settings.apiKey) {
      alert("请先填写 API URL 和 API Key")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${settings.apiUrl}/models`, {
        headers: {
          Authorization: `Bearer ${settings.apiKey}`,
        },
      })
      const data = await response.json()
      if (data.data) {
        const sortedModels = data.data.sort((a: Model, b: Model) => 
          a.id.toLowerCase().localeCompare(b.id.toLowerCase())
        )
        setModels(sortedModels)
      }
    } catch (error) {
      console.error("Error fetching models:", error)
      alert("获取模型列表失败，请检查 API URL 和 API Key")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    localStorage.setItem("apiSettings", JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" className="h-8 gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">返回</span>
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground mb-2">设置</h1>
          <p className="text-muted-foreground">配置 OpenAI 兼容的 API</p>
        </div>

        <div className="space-y-6">
          <Card className="p-8 rounded-2xl shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-6">API 配置</h2>

            <div className="space-y-5">
              <div>
                <Label htmlFor="apiUrl" className="text-sm font-medium text-foreground">
                  API URL
                </Label>
                <Input
                  id="apiUrl"
                  type="text"
                  placeholder="https://api.openai.com/v1"
                  value={settings.apiUrl}
                  onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
                  className="mt-2 h-11 rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="apiKey" className="text-sm font-medium text-foreground">
                  API Key
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="sk-..."
                  value={settings.apiKey}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  className="mt-2 h-11 rounded-xl"
                />
              </div>

              <Button
                onClick={fetchModels}
                disabled={loading}
                className="w-full h-11 rounded-xl gap-2"
                variant="secondary"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                获取模型列表
              </Button>
            </div>
          </Card>

          {models.length > 0 && (
            <Card className="p-8 rounded-2xl shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-6">选择模型</h2>
              <RadioGroup
                value={settings.selectedModel}
                onValueChange={(value) => setSettings({ ...settings, selectedModel: value })}
                className="space-y-3 max-h-96 overflow-y-auto"
              >
                {models.map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors"
                  >
                    <RadioGroupItem value={model.id} id={model.id} />
                    <Label htmlFor={model.id} className="flex-1 text-sm font-medium text-foreground cursor-pointer">
                      {model.id}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </Card>
          )}

          <Button onClick={handleSave} className="w-full h-12 rounded-xl gap-2 text-base" variant="outline">
            {saved ? (
              <>
                <Check className="h-5 w-5" />
                已保存
              </>
            ) : (
              "保存设置"
            )}
          </Button>
        </div>
      </main>
    </div>
  )
}
