<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h1>构建</h1>
    </div>

    <el-card>
      <el-table :data="builds" v-loading="loading" stripe>
        <el-table-column prop="buildNumber" label="构建号" width="100" />
        <el-table-column prop="projectName" label="项目" />
        <el-table-column prop="pipelineName" label="流水线" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="100">
          <template #default="{ row }">{{ row.duration }}s</template>
        </el-table-column>
        <el-table-column prop="startedAt" label="开始时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="router.push(`/builds/${row.id}`)">详情</el-button>
            <el-button v-if="row.status === 'running'" link type="warning" @click="handleCancel(row.id)">取消</el-button>
            <el-button v-if="row.status === 'failed'" link type="success" @click="handleRetry(row.id)">重试</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { buildApi } from '@/api/build'

const router = useRouter()
const loading = ref(true)
const builds = ref<any[]>([])

const statusMap: Record<string, { text: string; type: string }> = {
  success: { text: '成功', type: 'success' },
  failed: { text: '失败', type: 'danger' },
  running: { text: '运行中', type: 'primary' },
  pending: { text: '排队中', type: 'info' },
  cancelled: { text: '已取消', type: 'warning' },
}

const getStatusText = (status: string) => statusMap[status]?.text || status
const getStatusType = (status: string) => statusMap[status]?.type || 'info'

const fetchBuilds = async () => {
  try {
    const res = await buildApi.getList()
    if (res.data.code === 0) {
      builds.value = res.data.data?.items || res.data.data?.list || res.data.data || []
    }
  } finally {
    loading.value = false
  }
}

const handleCancel = async (id: number) => {
  try {
    await buildApi.cancel(id)
    ElMessage.success('已取消')
    fetchBuilds()
  } catch {
    ElMessage.error('取消失败')
  }
}

const handleRetry = async (id: number) => {
  try {
    await buildApi.retry(id)
    ElMessage.success('已重试')
    fetchBuilds()
  } catch {
    ElMessage.error('重试失败')
  }
}

onMounted(fetchBuilds)
</script>
