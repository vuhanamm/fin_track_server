import {
  generateContent as geminiText,
  generateContentWithImage as geminiImage,
  generateContentPro as geminiProText,
  generateContentWithImagePro as geminiProImage,
} from './gemini.client'
import { createGroqProvider } from './groq.client'
import { generateContent as cerebrasText } from './cerebras.client'

const groq1 = createGroqProvider('GROQ_API_KEY')
const groq2 = createGroqProvider('GROQ_API_KEY_2')
const groq3 = createGroqProvider('GROQ_API_KEY_3')
const groq4 = createGroqProvider('GROQ_API_KEY_4')

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
  { name: 'groq-1',      fn: groq1.generateContent },
  { name: 'groq-2',      fn: groq2.generateContent },
  { name: 'groq-3',      fn: groq3.generateContent },
  { name: 'groq-4',      fn: groq4.generateContent },
  { name: 'cerebras',    fn: cerebrasText           },
  { name: 'gemini',      fn: geminiText             },
  { name: 'gemini-pro',  fn: geminiProText          },
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

type ImageProvider = { name: string; fn: (prompt: string, img: string, mime: string) => Promise<string> }

const IMAGE_PROVIDERS: ImageProvider[] = [
  { name: 'groq-1',     fn: groq1.generateContentWithImage },
  { name: 'groq-2',     fn: groq2.generateContentWithImage },
  { name: 'groq-3',     fn: groq3.generateContentWithImage },
  { name: 'groq-4',     fn: groq4.generateContentWithImage },
  { name: 'gemini',     fn: geminiImage                    },
  { name: 'gemini-pro', fn: geminiProImage                 },
]

export async function generateContentWithImage(
  prompt: string,
  base64Image: string,
  mimeType: string
): Promise<string> {
  let lastError: unknown

  for (const provider of IMAGE_PROVIDERS) {
    try {
      const result = await provider.fn(prompt, base64Image, mimeType)
      return result
    } catch (err) {
      if (isQuotaError(err)) {
        console.warn(`[ai.provider] ${provider.name} quota/rate-limit trên image, thử provider tiếp theo`)
        lastError = err
        continue
      }
      throw err
    }
  }

  throw lastError
}
