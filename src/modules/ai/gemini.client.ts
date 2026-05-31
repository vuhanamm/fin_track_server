import { GoogleGenerativeAI, Part } from '@google/generative-ai'

const MODEL = 'gemini-2.0-flash'

function makeClient(envVar: string): GoogleGenerativeAI {
  const apiKey = process.env[envVar]
  if (!apiKey) throw new Error(`${envVar} env var is required`)
  return new GoogleGenerativeAI(apiKey)
}

async function callText(envVar: string, prompt: string): Promise<string> {
  const model = makeClient(envVar).getGenerativeModel({ model: MODEL })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

async function callImage(envVar: string, prompt: string, base64Image: string, mimeType: string): Promise<string> {
  const model = makeClient(envVar).getGenerativeModel({ model: MODEL })
  const parts: Part[] = [
    { inlineData: { mimeType, data: base64Image } },
    { text: prompt },
  ]
  const result = await model.generateContent(parts)
  return result.response.text()
}

// Free tier (GEMINI_API_KEY)
export async function generateContent(prompt: string): Promise<string> {
  return callText('GEMINI_API_KEY', prompt)
}

export async function generateContentWithImage(prompt: string, base64Image: string, mimeType: string): Promise<string> {
  return callImage('GEMINI_API_KEY', prompt, base64Image, mimeType)
}

// Paid tier (GEMINI_PRO_API_KEY)
export async function generateContentPro(prompt: string): Promise<string> {
  return callText('GEMINI_PRO_API_KEY', prompt)
}

export async function generateContentWithImagePro(prompt: string, base64Image: string, mimeType: string): Promise<string> {
  return callImage('GEMINI_PRO_API_KEY', prompt, base64Image, mimeType)
}
