<template>
  <div v-loading="loading">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h1>构建详情</h1>
      <el-button @click="router.back()">返回</el-button>
    </div>

    <el-card v-if="build">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="构建号">#{{ build.build_number || build.buildNumber }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(build.status)">{{ getStatusText(build.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="项目">{{ build.project_name || build.projectName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="流水线">{{ build.pipeline_name || build.pipelineName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="目标环境">
          <el-tag :type="environmentTypeTag(build.environment_type)">
            {{ build.environment_name || '-' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="分支">{{ build.branch || '-' }}</el-descriptions-item>
        <el-descriptions-item label="提交">{{ build.commit_sha || build.commitSha || '-' }}</el-descriptions-item>
        <el-descriptions-item label="耗时">{{ build.duration ?? '-' }}<span v-if="build.duration !== null && build.duration !== undefined">s</span></el-descriptions-item>
        <el-descriptions-item label="GitHub Run">
          <el-link v-if="build.github_run_url" type="primary" :href="build.github_run_url" target="_blank">
            打开 GitHub Actions
          </el-link>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="开始时间">{{ build.started_at || build.startedAt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="结束时间">{{ build.finished_at || build.finishedAt || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card title="构建日志" style="margin-top: 16px">
      <pre class="build-logs">{{ logs || '暂无日志' }}</pre>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { buildApi } from '@/api/build'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const id = Number(route.params.id)
const build = ref<any>(null)
const logs = ref('')

const statusMap: Record<string, { text: string; type: string }> = {
  success: { text: '成功', type: 'success' },
  failed: { text: '失败', type: 'danger' },
  running: { text: '运行中', type: 'primary' },
  pending: { text: '排队中', type: 'info' },
  cancelled: { text: '已取消', type: 'warning' },
  timeout: { text: '超时', type: 'warning' },
}

const getStatusText = (status: string) => statusMap[status]?.text || status
const getStatusType = (status: string) => statusMap[status]?.type || 'info'
const environmentTypeTag = (type: string) => {
  if (type === 'production') return 'danger'
  if (type === 'staging') return 'warning'
  if (type === 'testing') return 'success'
  return 'info'
}

onMounted(async () => {
  try {
    const [buildRes, logsRes] = await Promise.all([
      buildApi.getDetail(id),
      buildApi.getLogs(id),
    ])
    if (buildRes.data.code === 0) {
      build.value = buildRes.data.data
    }
    if (logsRes.data.code === 0) {
      logs.value = logsRes.data.data || ''
    }
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.build-logs {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: monospace;
  font-size: 13px;
  line-height: 1.6;
  max-height: 500px;
  overflow-y: auto;
}
</style>
