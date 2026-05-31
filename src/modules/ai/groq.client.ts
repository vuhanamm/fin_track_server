const BASE_URL = 'https://api.groq.com/openai/v1'
const MODEL_TEXT = 'llama-3.3-70b-versatile'
const MODEL_VISION = 'meta-llama/llama-4-scout-17b-16e-instruct'

interface ChatResponse {
  choices: Array<{ message: { content: string } }>
}

async function callGroq(apiKey: string, model: string, messages: unknown[]): Promise<string> {
  const resp = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.3 }),
  })

  if (!resp.ok) {
    const err = new Error(`Groq HTTP ${resp.status}`)
    ;(err as NodeJS.ErrnoException).code = String(resp.status)
    throw err
  }

  const data = (await resp.json()) as ChatResponse
  return data.choices[0].message.content
}

export function createGroqProvider(envVar: string) {
  function getKey(): string {
    const key = process.env[envVar]
    if (!key) throw new Error(`${envVar} not configured`)
    return key
  }

  return {
    generateContent: (prompt: string) =>
      callGroq(getKey(), MODEL_TEXT, [{ role: 'user', content: prompt }]),

    generateContentWithImage: (prompt: string, base64Image: string, mimeType: string) =>
      callGroq(getKey(), MODEL_VISION, [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            { type: 'text', text: prompt },
          ],
        },
      ]),
  }
}

const defaultProvider = createGroqProvider('GROQ_API_KEY')
export const generateContent = defaultProvider.generateContent
export const generateContentWithImage = defaultProvider.generateContentWithImage
