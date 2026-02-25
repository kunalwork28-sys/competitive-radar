const TINYFISH_API_URL = 'https://agent.tinyfish.ai/v1/automation/run-sse'

export async function runTinyFishAgent(url: string, goal: string): Promise<any> {
  const response = await fetch(TINYFISH_API_URL, {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.TINYFISH_API_KEY || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, goal }),
  })

  if (!response.ok) {
    throw new Error(`TinyFish API error: ${response.status}`)
  }

  const text = await response.text()

  // Parse SSE response to extract final result
  const lines = text.split('\n')
  let result = null

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.replace('data: ', ''))
        if (data.result) {
          result = data.result
        }
        if (data.output) {
          result = data.output
        }
        // Keep updating result with latest data
        if (typeof data === 'object' && !data.type) {
          result = data
        }
      } catch (e) {
        // Not JSON, skip
      }
    }
  }

  // Try to parse result as JSON if it's a string
  if (typeof result === 'string') {
    try {
      result = JSON.parse(result)
    } catch (e) {
      // Keep as string
    }
  }

  return result
}