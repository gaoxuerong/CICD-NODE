<template>
  <div v-loading="loading">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h1>流水线详情</h1>
      <div>
        <el-button type="primary" @click="router.push(`/pipelines/${id}/edit`)">编辑</el-button>
        <el-button @click="router.back()">返回</el-button>
      </div>
    </div>

    <el-card v-if="pipeline">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="ID">{{ pipeline.id }}</el-descriptions-item>
        <el-descriptions-item label="名称">{{ pipeline.name }}</el-descriptions-item>
        <el-descriptions-item label="所属项目">{{ pipeline.project_name || pipeline.project?.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="目标环境">
          <el-tag :type="environmentTypeTag(pipeline.environment_type)">
            {{ pipeline.environment_name || '-' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="触发方式">{{ triggerTypeText(pipeline.trigger_type) }}</el-descriptions-item>
        <el-descriptions-item label="分支过滤">{{ pipeline.branch_filter || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="pipeline.status === 'enabled' ? 'success' : 'info'">
            {{ pipeline.status === 'enabled' ? '启用' : '禁用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Workflow">{{ pipelineConfig.workflow_id || pipelineConfig.workflowId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="Ref">{{ pipelineConfig.ref || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建人">{{ pipeline.creator_name || pipeline.creator?.username || '-' }}</el-descriptions-item>
        <el-descriptions-item label="最近构建">{{ pipeline.last_build_at || pipeline.lastBuildAt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ pipeline.created_at || pipeline.createdAt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ pipeline.updated_at || pipeline.updatedAt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="配置" :span="2">
          <pre class="config-block">{{ configText }}</pre>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { pipelineApi } from '@/api/pipeline'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const id = Number(route.params.id)
const pipeline = ref<any>(null)

const triggerTypeMap: Record<string, string> = {
  manual: '手动触发',
  push: 'Push 触发',
  tag: 'Tag 触发',
  schedule: '定时触发',
}

const triggerTypeText = (value?: string) => triggerTypeMap[value || ''] || value || '-'

const environmentTypeTag = (type: string) => {
  if (type === 'production') return 'danger'
  if (type === 'staging') return 'warning'
  if (type === 'testing') return 'success'
  return 'info'
}

function parseConfig(value: any): Record<string, any> {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    const parsed = JSON.parse(value)
    return typeof parsed === 'string' ? parseConfig(parsed) : parsed
  } catch {
    return {}
  }
}

const pipelineConfig = computed(() => parseConfig(pipeline.value?.config))
const configText = computed(() => {
  if (!pipeline.value?.config) return '-'
  return JSON.stringify(pipelineConfig.value, null, 2)
})

onMounted(async () => {
  try {
    const res = await pipelineApi.getDetail(id)
    if (res.data.code === 0) {
      pipeline.value = res.data.data
    }
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.config-block {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}
</style>
