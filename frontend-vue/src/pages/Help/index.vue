<template>
  <div class="help-page">
    <div class="help-header">
      <div>
        <h1>帮助中心</h1>
        <p>面向当前 CI/CD 平台的智能问答助手</p>
      </div>
      <el-tag type="success" effect="plain">AI</el-tag>
    </div>

    <div ref="chatContainerRef" class="chat-shell"></div>
  </div>
</template>

<script setup lang="ts">
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import AiHelpChat from '@/components/AiHelpChat'

const chatContainerRef = ref<HTMLElement | null>(null)
let reactRoot: Root | null = null

onMounted(() => {
  if (!chatContainerRef.value) return
  reactRoot = createRoot(chatContainerRef.value)
  reactRoot.render(createElement(AiHelpChat))
})

onBeforeUnmount(() => {
  reactRoot?.unmount()
  reactRoot = null
})
</script>

<style scoped>
.help-page {
  display: flex;
  min-height: calc(100vh - 112px);
  flex-direction: column;
  gap: 16px;
}

.help-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.help-header h1 {
  margin: 0;
  color: #111827;
  font-size: 24px;
  font-weight: 650;
}

.help-header p {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.chat-shell {
  min-height: 640px;
  flex: 1;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

:deep(.ai-help-chat) {
  display: flex;
  height: 100%;
  min-height: 640px;
  flex-direction: column;
}

:deep(.ai-help-chat__toolbar) {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eef2f7;
  padding: 0 16px;
}

:deep(.ai-help-chat__status) {
  color: #4b5563;
  font-size: 13px;
}

:deep(.ai-help-chat__messages) {
  flex: 1;
  min-height: 0;
  padding: 18px 20px;
}

:deep(.ai-help-chat__sender) {
  margin: 0 16px 16px;
}

:deep(.ai-help-chat__quick-actions) {
  display: flex;
  gap: 8px;
  padding: 10px 16px 8px;
  border-top: 1px solid #eef2f7;
}

:deep(.ai-help-chat__markdown) {
  line-height: 1.72;
}

:deep(.ai-help-chat__markdown p) {
  margin: 0 0 8px;
}

:deep(.ai-help-chat__markdown p:last-child) {
  margin-bottom: 0;
}

:deep(.ai-help-chat__markdown ul),
:deep(.ai-help-chat__markdown ol) {
  margin: 8px 0;
  padding-left: 22px;
}

:deep(.ai-help-chat__markdown table) {
  width: 100%;
  margin: 10px 0;
  border-collapse: collapse;
  font-size: 13px;
}

:deep(.ai-help-chat__markdown th),
:deep(.ai-help-chat__markdown td) {
  border: 1px solid #e5e7eb;
  padding: 6px 8px;
}

:deep(.ai-help-chat__markdown code) {
  border-radius: 4px;
  background: #f3f4f6;
  color: #be123c;
  font-size: 12px;
  padding: 2px 4px;
}

:deep(.ai-help-chat__code) {
  margin: 10px 0;
}

:deep(.ant-app) {
  height: 100%;
}
</style>
