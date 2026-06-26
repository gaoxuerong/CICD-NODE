import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { App as AntdApp, Button, ConfigProvider, Segmented, Space, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { DeleteOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { Bubble, Sender, XProvider } from '@ant-design/x'
import type { BubbleItemType } from '@ant-design/x'
import { XMarkdown } from '@ant-design/x-markdown'
import { streamAiChat, streamAiChatSse } from '@/api/ai'
import { clearAiChatRecord, readAiChatRecord, writeAiChatRecord } from '@/utils/aiChatStore'

import 'antd/dist/reset.css'

const MAX_STORED_CHATS = 50

type ChatRole = 'user' | 'assistant'
type ChatStatus = 'local' | 'loading' | 'streaming' | 'success' | 'error'
type StreamMode = 'default' | 'sse'

interface StoredChatMessage {
  id: string
  role: ChatRole
  content: string
  status?: ChatStatus
  createdAt: number
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getStorageKey() {
  try {
    const storedUser = window.localStorage.getItem('cicd_user_info')
    const user = storedUser ? JSON.parse(storedUser) : null
    const userId = user?.id || user?.username || 'anonymous'
    return `cicd_ai_help_chats_${userId}`
  } catch {
    return 'cicd_ai_help_chats_anonymous'
  }
}

function normalizeStoredMessage(item: any): StoredChatMessage | null {
  if (!item || typeof item !== 'object') return null
  const role = item.role === 'assistant' || item.role === 'ai' ? 'assistant' : item.role === 'user' ? 'user' : null
  const content = typeof item.content === 'string' ? item.content : ''
  if (!role || !content) return null

  return {
    id: String(item.id || item.key || createId()),
    role,
    content,
    status: item.status === 'error' ? 'error' : item.status === 'loading' ? 'loading' : role === 'assistant' ? 'success' : 'local',
    createdAt: Number(item.createdAt || item.createAt || Date.now()),
  }
}

function toApiMessages(chats: StoredChatMessage[]) {
  return chats
    .filter((chat) => chat.status !== 'loading')
    .map((chat) => ({
      role: chat.role === 'assistant' ? 'assistant' : 'user',
      content: chat.content,
    }))
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="ai-help-chat__markdown">
      <XMarkdown content={content} />
    </div>
  )
}

export default function AiHelpChat() {
  const storageKey = useMemo(() => getStorageKey(), [])
  const [chats, setChats] = useState<StoredChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamMode, setStreamMode] = useState<StreamMode>('default')
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let active = true

    readAiChatRecord<StoredChatMessage>(storageKey).then((storedChats) => {
      if (!active) return
      setChats(storedChats.map(normalizeStoredMessage).filter((item): item is StoredChatMessage => Boolean(item)))
    })

    return () => {
      active = false
    }
  }, [storageKey])

  const persistChats = useCallback((nextChats: StoredChatMessage[]) => {
    const serializableChats = nextChats
      .filter((chat) => chat.status !== 'loading')
      .slice(-MAX_STORED_CHATS)
    setChats(nextChats)
    void writeAiChatRecord(storageKey, serializableChats)
  }, [storageKey])

  const clearChats = useCallback(() => {
    setChats([])
    void clearAiChatRecord(storageKey)
  }, [storageKey])

  const submitMessage = useCallback(
    async (rawMessage: string) => {
      const message = rawMessage.trim()
      if (!message || loading) return

      const userMessage: StoredChatMessage = {
        id: createId(),
        role: 'user',
        content: message,
        status: 'local',
        createdAt: Date.now(),
      }
      const loadingMessage: StoredChatMessage = {
        id: createId(),
        role: 'assistant',
        content: '',
        status: 'loading',
        createdAt: Date.now(),
      }

      const pendingChats = [...chats, userMessage, loadingMessage]
      setInputValue('')
      setLoading(true)
      setChats(pendingChats)
      let streamedAnswer = ''
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      try {
        const streamChat = streamMode === 'sse' ? streamAiChatSse : streamAiChat
        await streamChat(
          toApiMessages([...chats, userMessage]),
          (chunk) => {
            streamedAnswer += chunk
            setChats((currentChats) =>
              currentChats.map((chat) =>
                chat.id === loadingMessage.id
                  ? {
                      ...chat,
                      content: streamedAnswer || '正在思考...',
                      status: 'streaming',
                    }
                  : chat
              )
            )
          },
          abortController.signal
        )
        const answer = streamedAnswer || 'AI 未返回有效内容'
        const nextChats = pendingChats.map((chat) =>
          chat.id === loadingMessage.id
            ? { ...chat, content: answer, status: 'success' as ChatStatus }
            : chat
        )
        persistChats(nextChats)
      } catch (err: any) {
        const answer = err?.message || 'AI 助手暂时无法回答，请稍后重试'
        const nextChats = pendingChats.map((chat) =>
          chat.id === loadingMessage.id
            ? { ...chat, content: answer, status: 'error' as ChatStatus }
            : chat
        )
        persistChats(nextChats)
      } finally {
        setLoading(false)
        abortControllerRef.current = null
      }
    },
    [chats, loading, persistChats, streamMode]
  )

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort()
    setLoading(false)
    setChats((currentChats) => currentChats.filter((chat) => chat.status !== 'loading'))
  }, [])

  const bubbleItems: BubbleItemType[] = useMemo(() => {
    const items: BubbleItemType[] = chats.map((chat) => ({
      key: chat.id,
      role: chat.role === 'assistant' ? 'ai' : 'user',
      content: chat.content,
      loading: chat.status === 'loading' && !chat.content,
      streaming: chat.status === 'streaming',
      status: chat.status === 'error' ? 'error' : chat.status === 'loading' ? 'loading' : 'success',
      contentRender:
        chat.role === 'assistant'
          ? () => <MarkdownContent content={chat.content} />
          : undefined,
    }))

    if (items.length > 0) return items
    return [
      {
        key: 'welcome',
        role: 'ai',
        content:
          '你好，我是 CI/CD 平台助手。你可以问我项目权限、流水线、构建失败、Git 凭据、环境和通知配置相关问题。',
        contentRender: (content) => <MarkdownContent content={String(content)} />,
      },
    ]
  }, [chats])

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563eb',
          borderRadius: 6,
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        },
      }}
    >
      <XProvider locale={zhCN}>
        <AntdApp>
          <div className="ai-help-chat">
            <div className="ai-help-chat__toolbar">
              <span className="ai-help-chat__status">
                {loading ? `AI 正在回答（${streamMode === 'sse' ? 'SSE' : '默认'}）` : 'AI 助手'}
              </span>
              <Space>
                <Segmented
                  disabled={loading}
                  size="small"
                  value={streamMode}
                  options={[
                    { label: '默认流', value: 'default' },
                    { label: 'SSE流', value: 'sse' },
                  ]}
                  onChange={(value) => setStreamMode(value as StreamMode)}
                />
                <Button
                  icon={<DeleteOutlined />}
                  size="small"
                  type="text"
                  onClick={clearChats}
                  title="清空当前聊天"
                />
              </Space>
            </div>

            <Bubble.List
              autoScroll
              className="ai-help-chat__messages"
              items={bubbleItems}
              role={{
                ai: {
                  placement: 'start',
                  variant: 'filled',
                  shape: 'corner',
                },
                user: {
                  placement: 'end',
                  variant: 'filled',
                  shape: 'corner',
                },
              }}
            />

            <div className="ai-help-chat__quick-actions">
              <Button
                icon={<QuestionCircleOutlined />}
                size="small"
                onClick={() => setInputValue('我应该如何排查一次失败的构建？')}
              >
                常见问题
              </Button>
            </div>

            <Sender
              autoSize={{ minRows: 2, maxRows: 5 }}
              className="ai-help-chat__sender"
              loading={loading}
              placeholder="输入你的问题，例如：为什么我不能编辑项目？"
              submitType="enter"
              value={inputValue}
              onCancel={cancelStream}
              onChange={(value) => setInputValue(value)}
              onSubmit={submitMessage}
            />
          </div>
        </AntdApp>
      </XProvider>
    </ConfigProvider>
  )
}
