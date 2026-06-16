<template>
  <div>
    <h1 style="margin-bottom: 24px">仪表盘</h1>

    <el-row :gutter="16">
      <el-col :span="6">
        <el-card>
          <el-statistic title="项目总数" :value="stats.projects || 0">
            <template #prefix>
              <el-icon style="color: #409eff"><FolderOpened /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <el-statistic title="流水线总数" :value="stats.pipelines || 0">
            <template #prefix>
              <el-icon style="color: #e6a23c"><Connection /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <el-statistic title="构建总数" :value="stats.builds.total || 0">
            <template #prefix>
              <el-icon style="color: #67c23a"><CircleCheckFilled /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <el-statistic title="构建成功率" :value="stats.builds.successRate || 0" suffix="%">
            <template #prefix>
              <el-icon style="color: #67c23a"><CircleCheckFilled /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
    </el-row>

    <el-card title="最近构建" style="margin-top: 24px">
      <el-table :data="recentBuilds" v-loading="loading" stripe size="small">
        <el-table-column label="构建号" width="100">
          <template #default="{ row }">#{{ row.build_number || row.buildNumber }}</template>
        </el-table-column>
        <el-table-column label="项目">
          <template #default="{ row }">{{ row.project_name || row.projectName || '-' }}</template>
        </el-table-column>
        <el-table-column label="流水线">
          <template #default="{ row }">{{ row.pipeline_name || row.pipelineName || '-' }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="100">
          <template #default="{ row }">
            {{ row.duration ?? '-' }}<span v-if="row.duration !== null && row.duration !== undefined">s</span>
          </template>
        </el-table-column>
        <el-table-column label="时间">
          <template #default="{ row }">{{ row.started_at || row.startedAt || row.created_at || '-' }}</template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-if="buildsTotal > buildsPageSize"
        :current-page="buildsPage"
        :page-size="buildsPageSize"
        :total="buildsTotal"
        layout="total, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @current-change="handleBuildsPageChange"
      />
    </el-card>

    <el-card title="最近项目" style="margin-top: 24px">
      <el-table :data="recentProjects" v-loading="loading" stripe size="small">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="项目名称" />
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column prop="language" label="语言" width="120">
          <template #default="{ row }">{{ row.language || '-' }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '活跃' : '不活跃' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ row.created_at || row.createdAt || '-' }}</template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-if="projectsTotal > projectsPageSize"
        :current-page="projectsPage"
        :page-size="projectsPageSize"
        :total="projectsTotal"
        layout="total, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @current-change="handleProjectsPageChange"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { dashboardApi } from '@/api/dashboard'

const loading = ref(true)
const stats = ref({
  projects: 0,
  pipelines: 0,
  users: 0,
  environments: 0,
  builds: {
    total: 0,
    running: 0,
    success: 0,
    failed: 0,
    successRate: 0,
  },
})
const recentBuilds = ref<any[]>([])
const recentProjects = ref<any[]>([])

const buildsPage = ref(1)
const buildsPageSize = ref(10)
const buildsTotal = ref(0)
const projectsPage = ref(1)
const projectsPageSize = ref(5)
const projectsTotal = ref(0)

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

const fetchStats = async () => {
  try {
    const res = await dashboardApi.getStats()
    if (res.data.code === 0) {
      stats.value = {
        ...stats.value,
        ...res.data.data,
        builds: {
          ...stats.value.builds,
          ...(res.data.data?.builds || {}),
        },
      }
    }
  } catch (error) {
    console.error('获取统计数据失败', error)
  }
}

const fetchRecentBuilds = async () => {
  try {
    const res = await dashboardApi.getRecentBuilds({
      page: buildsPage.value,
      pageSize: buildsPageSize.value,
    })
    if (res.data.code === 0) {
      const data = res.data.data
      recentBuilds.value = data?.items || data?.list || data || []
      buildsTotal.value = data?.total || recentBuilds.value.length || 0
    }
  } catch (error) {
    console.error('获取最近构建失败', error)
  }
}

const fetchRecentProjects = async () => {
  try {
    const res = await dashboardApi.getRecentProjects({
      page: projectsPage.value,
      pageSize: projectsPageSize.value,
    })
    if (res.data.code === 0) {
      const data = res.data.data
      recentProjects.value = data?.items || data?.list || data || []
      projectsTotal.value = data?.total || recentProjects.value.length || 0
    }
  } catch (error) {
    console.error('获取最近项目失败', error)
  }
}

const handleBuildsPageChange = (page: number) => {
  buildsPage.value = page
  fetchRecentBuilds()
}

const handleProjectsPageChange = (page: number) => {
  projectsPage.value = page
  fetchRecentProjects()
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([fetchStats(), fetchRecentBuilds(), fetchRecentProjects()])
  } finally {
    loading.value = false
  }
})
</script>
