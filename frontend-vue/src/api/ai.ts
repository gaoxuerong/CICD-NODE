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
