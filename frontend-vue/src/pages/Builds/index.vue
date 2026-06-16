<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h1>构建</h1>
    </div>

    <el-card>
      <el-table :data="builds" v-loading="loading" stripe>
        <el-table-column label="构建号" width="100">
          <template #default="{ row }">#{{ row.build_number || row.buildNumber }}</template>
        </el-table-column>
        <el-table-column label="项目">
          <template #default="{ row }">{{ row.project_name || row.projectName || '-' }}</template>
        </el-table-column>
        <el-table-column label="流水线">
          <template #default="{ row }">{{ row.pipeline_name || row.pipelineName || '-' }}</template>
        </el-table-column>
        <el-table-column label="环境" width="120">
          <template #default="{ row }">
            <el-tag :type="environmentTypeTag(row.environment_type)">
              {{ row.environment_name || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="100">
          <template #default="{ row }">{{ row.duration ?? '-' }}<span v-if="row.duration !== null && row.duration !== undefined">s</span></template>
        </el-table-column>
        <el-table-column label="开始时间" width="180">
          <template #default="{ row }">{{ row.started_at || row.startedAt || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="router.push(`/builds/${row.id}`)">详情</el-button>
            <el-button v-if="row.status === 'running'" link type="warning" @click="handleCancel(row.id)">取消</el-button>
            <el-button v-if="row.status === 'failed'" link type="success" @click="handleRetry(row.id)">重试</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > 0"
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @current-change="handlePageChange"
      />
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
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

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

const fetchBuilds = async () => {
  loading.value = true
  try {
    const res = await buildApi.getList({ page: currentPage.value, pageSize: pageSize.value })
    if (res.data.code === 0) {
      builds.value = res.data.data?.items || res.data.data?.list || []
      total.value = res.data.data?.total || builds.value.length || 0
    }
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchBuilds()
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
