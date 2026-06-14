<template>
  <div>
    <h1 style="margin-bottom: 24px">仪表盘</h1>

    <el-row :gutter="16">
      <el-col :span="6">
        <el-card>
          <el-statistic title="项目总数" :value="stats.totalProjects || 0">
            <template #prefix>
              <el-icon style="color: #409eff"><FolderOpened /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <el-statistic title="流水线总数" :value="stats.totalPipelines || 0">
            <template #prefix>
              <el-icon style="color: #e6a23c"><Connection /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <el-statistic title="今日构建成功" :value="stats.todaySuccess || 0">
            <template #prefix>
              <el-icon style="color: #67c23a"><CircleCheckFilled /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <el-statistic title="今日构建失败" :value="stats.todayFailed || 0">
            <template #prefix>
              <el-icon style="color: #f56c6c"><CircleCloseFilled /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
    </el-row>

    <el-card title="最近构建" style="margin-top: 24px">
      <el-table :data="recentBuilds" v-loading="loading" stripe size="small">
        <el-table-column prop="buildNumber" label="构建号" width="100" />
        <el-table-column prop="projectName" label="项目" />
        <el-table-column prop="pipelineName" label="流水线" />
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="100">
          <template #default="{ row }">{{ row.duration }}s</template>
        </el-table-column>
        <el-table-column prop="startedAt" label="时间" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { dashboardApi } from '@/api/dashboard'

const loading = ref(true)
const stats = ref({
  totalProjects: 0,
  totalPipelines: 0,
  todaySuccess: 0,
  todayFailed: 0,
})
const recentBuilds = ref<any[]>([])

const statusMap: Record<string, { text: string; type: string }> = {
  success: { text: '成功', type: 'success' },
  failed: { text: '失败', type: 'danger' },
  running: { text: '运行中', type: 'primary' },
  pending: { text: '排队中', type: 'info' },
}

const getStatusText = (status: string) => statusMap[status]?.text || status
const getStatusType = (status: string) => statusMap[status]?.type || 'info'

onMounted(async () => {
  try {
    const res = await dashboardApi.getStats()
    if (res.data.code === 0) {
      stats.value = res.data.data
      recentBuilds.value = res.data.data.recentBuilds || []
    }
  } finally {
    loading.value = false
  }
})
</script>
