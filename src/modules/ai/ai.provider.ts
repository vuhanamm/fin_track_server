import { generateContent as geminiText, generateContentWithImage as geminiImage } from './gemini.client'
import { generateContent as groqText } from './groq.client'
import { generateContent as cerebrasText } from './cerebras.client'

// 429, RESOURCE_EXHAUSTED, rate-limit → thử provider tiếp theo
// 401, 400, 500 → lỗi thực sự, throw ngay
function isQuotaError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  const code = (err as NodeJS.ErrnoException).code ?? ''
  return (
    code === '429' ||
    code === '503' ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('too many requests') ||
    msg.includes('overloaded')
  )
}

type TextProvider = { name: string; fn: (prompt: string) => Promise<string> }

const TEXT_PROVIDERS: TextProvider[] = [
  { name: 'gemini', fn: geminiText },
  { name: 'groq',   fn: groqText   },
  { name: 'cerebras', fn: cerebrasText },
]

export async function generateContent(prompt: string): Promise<string> {
  let lastError: unknown

  for (const provider of TEXT_PROVIDERS) {
    try {
      const result = await provider.fn(prompt)
      return result
    } catch (err) {
      if (isQuotaError(err)) {
        console.warn(`[ai.provider] ${provider.name} quota/rate-limit, thử provider tiếp theo`)
        lastError = err
        continue
      }
      throw err
    }
  }

  throw lastError
}

// Chỉ Gemini hỗ trợ multimodal — không fallback sang provider khác
export async function generateContentWithImage(
  prompt: string,
  base64Image: string,
  mimeType: string
): Promise<string> {
  return geminiImage(prompt, base64Image, mimeType)
}
