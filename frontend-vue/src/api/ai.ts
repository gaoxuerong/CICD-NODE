import request from '@/utils/request'
import { getToken } from '@/utils/storage'

export interface AiChatMessage {
  role: string
  content: string
}

export function sendAiChat(messages: AiChatMessage[]) {
  return request.post<{ code: number; data: { answer: string }; message?: string }>('/ai/chat', { messages })
}

export async function streamAiChat(
  messages: AiChatMessage[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
) {
  const token = getToken()
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages, stream: true }),
    signal,
  })

  if (!response.ok || !response.body) {
    const message = await response.text().catch(() => '')
    throw new Error(message || 'AI 服务调用失败')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    if (chunk) onChunk(chunk)
  }
}

/**
 * SSE 版本的 AI 流式对话。
 * 使用 POST 发送消息，响应体按 text/event-stream 解析。
 */
export async function streamAiChatSse(
  messages: AiChatMessage[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
) {
  const token = getToken()

  const response = await fetch('/api/ai-sse/sse-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages }),
    signal,
  })

  if (!response.ok || !response.body) {
    const message = await response.text().catch(() => '')
    throw new Error(message || 'AI 服务调用失败')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const handleEventBlock = (eventBlock: string) => {
    const lines = eventBlock.split(/\r?\n/)
    let eventName = 'message'
    const dataLines: string[] = []

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart())
      }
    }

    const eventData = dataLines.join('\n')

    if (eventName === 'message' && eventData) {
      const data = JSON.parse(eventData) as { content?: string }
      if (data.content) onChunk(data.content)
      return false
    }

    if (eventName === 'done') return true

    if (eventName === 'error') {
      let errorMessage = eventData || 'SSE 流式传输错误'
      try {
        const data = JSON.parse(eventData) as { message?: string }
        errorMessage = data.message || errorMessage
      } catch (err) {
        if (!(err instanceof SyntaxError)) throw err
      }
      throw new Error(errorMessage)
    }

    return false
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        buffer += decoder.decode()
        break
      }

      buffer += decoder.decode(value, { stream: true })

      const events = buffer.split(/\r?\n\r?\n/)
      buffer = events.pop() ?? ''

      for (const eventBlock of events) {
        if (handleEventBlock(eventBlock)) return
      }
    }

    if (buffer.trim() && handleEventBlock(buffer)) return
  } finally {
    reader.releaseLock()
  }
}

export const streamAiChatSseFetch = streamAiChatSse
