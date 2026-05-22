const BASE_URL = 'https://api.groq.com/openai/v1'
const MODEL = 'llama-3.3-70b-versatile'

interface ChatResponse {
  choices: Array<{ message: { content: string } }>
}

export async function generateContent(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')

  const resp = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    }),
  })

  if (!resp.ok) {
    const err = new Error(`Groq HTTP ${resp.status}`)
    ;(err as NodeJS.ErrnoException).code = String(resp.status)
    throw err
  }

  const data = (await resp.json()) as ChatResponse
  return data.choices[0].message.content
}
