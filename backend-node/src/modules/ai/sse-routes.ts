import { Router } from 'express';
import { authMiddleware } from '../../common/auth-middleware';
import { getSettings, isEnabled } from '../../services/settings-service';

const router = Router();

type ChatMessage = {
  role?: string;
  content?: unknown;
};

type OpenAiStreamChunk = {
  choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
  error?: { message?: string };
};

function writeSse(res: import('express').Response, event: string, data: unknown) {
  if (res.writableEnded || res.destroyed) return;
  res.write(`event: ${event}\n`);
  res.write(`data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`);
}

function normalizeContent(content: unknown) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'text' in item) return String((item as { text?: unknown }).text ?? '');
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  if (content == null) return '';
  return String(content);
}

function toOpenAiMessages(messages: ChatMessage[]) {
  const normalized = messages
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: normalizeContent(message.content).trim(),
    }))
    .filter((message) => message.content);

  return [
    {
      role: 'system',
      content:
        '你是 CI/CD 平台帮助中心助手。请用简体中文回答，优先围绕项目、流水线、构建、环境、Git 凭据、权限、通知、系统配置和 GitHub Actions 触发流程提供操作建议。无法确定时说明需要管理员检查配置，不要编造平台不存在的能力。',
    },
    ...normalized.slice(-12),
  ];
}

function normalizeBaseUrl(value: string) {
  const rawValue = value || 'https://api.openai.com/v1';
  let parsed: URL;
  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error('AI Base URL 格式不正确，请填写完整的 http(s) 地址');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('AI Base URL 仅支持 http 或 https');
  }

  return rawValue.replace(/\/+$/, '');
}

/**
 * SSE 版本的 AI 流式对话
 * 路由: POST /api/ai-sse/sse-chat
 * 响应: text/event-stream
 */
router.post('/sse-chat', authMiddleware, async (req, res) => {
  let clientClosed = false;
  const upstreamAbortController = new AbortController();

  req.on('close', () => {
    clientClosed = true;
    upstreamAbortController.abort();
  });

  try {
    const { messages } = req.body ?? {};
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400);
      res.setHeader('Content-Type', 'text/event-stream');
      writeSse(res, 'error', { message: 'messages 必须是非空数组' });
      res.end();
      return;
    }

    const settings = await getSettings(['ai.enabled', 'ai.base_url', 'ai.model', 'ai.api_key']);
    if (!isEnabled(settings['ai.enabled'])) {
      res.status(400);
      res.setHeader('Content-Type', 'text/event-stream');
      writeSse(res, 'error', { message: 'AI 助手未启用，请先在系统配置中开启' });
      res.end();
      return;
    }
    if (!settings['ai.api_key']) {
      res.status(400);
      res.setHeader('Content-Type', 'text/event-stream');
      writeSse(res, 'error', { message: 'AI API Key 未配置' });
      res.end();
      return;
    }

    let baseUrl: string;
    try {
      baseUrl = normalizeBaseUrl(settings['ai.base_url']);
    } catch (err) {
      res.status(400);
      res.setHeader('Content-Type', 'text/event-stream');
      writeSse(res, 'error', { message: err instanceof Error ? err.message : 'AI Base URL 配置不正确' });
      res.end();
      return;
    }

    // 请求 OpenAI 流式接口
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings['ai.api_key']}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings['ai.model'] || 'gpt-4o-mini',
        messages: toOpenAiMessages(messages),
        stream: true,
        temperature: 0.2,
      }),
      signal: upstreamAbortController.signal,
    });

    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => '');
      let errorMessage = text || 'AI 服务调用失败';
      try {
        const payload = JSON.parse(text) as { error?: { message?: string } };
        errorMessage = payload?.error?.message || errorMessage;
      } catch {
        // Keep plain-text error body.
      }
      res.status(response.status >= 500 ? 502 : 400);
      res.setHeader('Content-Type', 'text/event-stream');
      writeSse(res, 'error', { message: errorMessage });
      res.end();
      return;
    }

    // 设置 SSE 响应头
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (clientClosed) return;
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') {
            writeSse(res, 'done', '[DONE]');
            res.end();
            return;
          }

          try {
            const chunk = JSON.parse(data) as OpenAiStreamChunk;
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) {
              writeSse(res, 'message', { content });
            }
          } catch {
            // Ignore malformed SSE fragments from upstream.
          }
        }
      }

      // 正常结束
      writeSse(res, 'done', '[DONE]');
      res.end();
    } catch (err) {
      if (clientClosed || upstreamAbortController.signal.aborted) return;
      writeSse(res, 'error', { message: err instanceof Error ? err.message : '流式传输中断' });
      res.end();
    }
  } catch (err) {
    if (clientClosed || upstreamAbortController.signal.aborted) return;
    res.status(502);
    res.setHeader('Content-Type', 'text/event-stream');
    writeSse(res, 'error', { message: err instanceof Error ? `AI 服务连接失败：${err.message}` : 'AI 服务连接失败' });
    res.end();
  }
});

export default router;
