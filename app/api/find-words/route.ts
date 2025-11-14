import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { word } = await request.json()

    if (!word || typeof word !== "string") {
      return Response.json({ error: "Invalid word" }, { status: 400 })
    }

    const settingsHeader = request.headers.get("x-api-settings")
    let apiUrl = "https://api.openai.com/v1"
    let apiKey = ""
    let selectedModels = ["gpt-4o-mini"]

    if (settingsHeader) {
      try {
        const settings = JSON.parse(settingsHeader)
        apiUrl = settings.apiUrl || apiUrl
        apiKey = settings.apiKey || apiKey
        selectedModels = settings.selectedModels || selectedModels
      } catch (e) {
        console.error("[v0] Error parsing settings:", e)
      }
    }

    const modelToUse = selectedModels[0] || "gpt-4o-mini"

    const semanticPrompt = `Given the English word "${word}", provide 5 semantically similar words (synonyms or words with similar meanings).

For each word, provide:
1. The word itself
2. A brief definition in Chinese

Format your response as a JSON array like this:
[
  {"word": "joyful", "definition": "充满喜悦的，快乐的"},
  {"word": "cheerful", "definition": "愉快的，高兴的"}
]

Only return the JSON array, no other text.`

    let semanticResult, visualResult

    if (apiKey && apiUrl !== "https://api.openai.com/v1") {
      // Custom OpenAI-compatible API
      const response1 = await fetch(`${apiUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [{ role: "user", content: semanticPrompt }],
        }),
      })
      const data1 = await response1.json()
      semanticResult = { text: data1.choices?.[0]?.message?.content || "[]" }

      const visualPrompt = `Given the English word "${word}", provide 5 words that look visually similar in spelling (similar letters, patterns, or structure).

For each word, provide:
1. The word itself
2. An explanation of the similarity in Chinese

Format your response as a JSON array like this:
[
  {"word": "hoppy", "similarity": "只有一个字母不同，p 变成了 pp"},
  {"word": "harpy", "similarity": "首尾相同，中间字母相似"}
]

Only return the JSON array, no other text.`

      const response2 = await fetch(`${apiUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [{ role: "user", content: visualPrompt }],
        }),
      })
      const data2 = await response2.json()
      visualResult = { text: data2.choices?.[0]?.message?.content || "[]" }
    } else {
      // Use AI SDK with default model
      semanticResult = await generateText({
        model: "openai/gpt-4o-mini",
        prompt: semanticPrompt,
      })

      const visualPrompt = `Given the English word "${word}", provide 5 words that look visually similar in spelling (similar letters, patterns, or structure).

For each word, provide:
1. The word itself
2. An explanation of the similarity in Chinese

Format your response as a JSON array like this:
[
  {"word": "hoppy", "similarity": "只有一个字母不同，p 变成了 pp"},
  {"word": "harpy", "similarity": "首尾相同，中间字母相似"}
]

Only return the JSON array, no other text.`

      visualResult = await generateText({
        model: "openai/gpt-4o-mini",
        prompt: visualPrompt,
      })
    }

    // Parse results
    let semanticWords = []
    let similarWords = []

    try {
      const semanticText = semanticResult.text.trim()
      const semanticJson = semanticText.match(/\[[\s\S]*\]/)?.[0]
      if (semanticJson) {
        semanticWords = JSON.parse(semanticJson)
      }
    } catch (e) {
      console.error("[v0] Error parsing semantic words:", e)
      semanticWords = [
        { word: "glad", definition: "高兴的" },
        { word: "joyful", definition: "充满喜悦的" },
        { word: "cheerful", definition: "愉快的" },
      ]
    }

    try {
      const visualText = visualResult.text.trim()
      const visualJson = visualText.match(/\[[\s\S]*\]/)?.[0]
      if (visualJson) {
        similarWords = JSON.parse(visualJson)
      }
    } catch (e) {
      console.error("[v0] Error parsing similar words:", e)
      similarWords = [
        { word: "hobby", similarity: "前两个字母相同" },
        { word: "hippy", similarity: "首尾字母相同" },
        { word: "harpy", similarity: "首尾相同，中间相似" },
      ]
    }

    return Response.json({
      semanticWords,
      similarWords,
    })
  } catch (error) {
    console.error("[v0] Error in find-words API:", error)
    return Response.json({ error: "Failed to process request" }, { status: 500 })
  }
}
