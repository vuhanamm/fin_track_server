import { GoogleGenerativeAI, Part } from '@google/generative-ai'

let client: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY env var is required')
    client = new GoogleGenerativeAI(apiKey)
  }
  return client
}

export async function generateContent(prompt: string): Promise<string> {
  const genAI = getClient()
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

export async function generateContentWithImage(
  prompt: string,
  base64Image: string,
  mimeType: string
): Promise<string> {
  const genAI = getClient()
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const parts: Part[] = [
    { inlineData: { mimeType, data: base64Image } },
    { text: prompt },
  ]
  const result = await model.generateContent(parts)
  return result.response.text()
}
