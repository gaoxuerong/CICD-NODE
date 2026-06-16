<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h1>流水线</h1>
      <el-button type="primary" @click="router.push('/pipelines/create')">
        <el-icon><Plus /></el-icon>
        创建流水线
      </el-button>
    </div>

    <el-card>
      <el-table :data="pipelines" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="名称">
          <template #default="{ row }">
            <el-link type="primary" @click="router.push(`/pipelines/${row.id}`)">{{ row.name }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="project_name" label="项目" show-overflow-tooltip />
        <el-table-column label="目标环境" width="130">
          <template #default="{ row }">
            <el-tag :type="environmentTypeTag(row.environment_type)">
              {{ row.environment_name || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="trigger_type" label="触发" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">
              {{ row.status === 'enabled' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ row.created_at || row.createdAt || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="success"
              :loading="isTriggering(row.id)"
              :disabled="isTriggering(row.id) || !canTriggerBuild(row)"
              @click="handleTrigger(row)"
            >
              {{ isTriggering(row.id) ? '触发中' : '触发' }}
            </el-button>
            <el-button link type="primary" @click="router.push(`/pipelines/${row.id}`)">详情</el-button>
            <el-button link type="primary" :disabled="!canManagePipeline(row)" @click="router.push(`/pipelines/${row.id}/edit`)">编辑</el-button>
            <el-popconfirm title="确定删除该流水线？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button link type="danger" :disabled="!canManagePipeline(row)">删除</el-button>
              </template>
            </el-popconfirm>
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
import { pipelineApi } from '@/api/pipeline'
import { buildApi } from '@/api/build'

const router = useRouter()
const loading = ref(true)
const pipelines = ref<any[]>([])
const triggeringPipelineIds = ref<Set<number>>(new Set())
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

const isTriggering = (id: number) => triggeringPipelineIds.value.has(id)
const canManagePipeline = (row: any) => Boolean(row.permissions?.canManagePipelines)
const canTriggerBuild = (row: any) => Boolean(row.permissions?.canTriggerBuild)

const environmentTypeTag = (type: string) => {
  if (type === 'production') return 'danger'
  if (type === 'staging') return 'warning'
  if (type === 'testing') return 'success'
  return 'info'
}

const setTriggering = (id: number, value: boolean) => {
  const next = new Set(triggeringPipelineIds.value)
  if (value) {
    next.add(id)
  } else {
    next.delete(id)
  }
  triggeringPipelineIds.value = next
}

const fetchPipelines = async () => {
  loading.value = true
  try {
    const res = await pipelineApi.getList({ page: currentPage.value, pageSize: pageSize.value })
    if (res.data.code === 0) {
      pipelines.value = res.data.data?.items || res.data.data?.list || []
      total.value = res.data.data?.total || pipelines.value.length || 0
    }
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchPipelines()
}

const handleTrigger = async (row: any) => {
  if (isTriggering(row.id)) return

  setTriggering(row.id, true)
  try {
    const res = await buildApi.trigger({
      projectId: row.project_id,
      pipelineId: row.id,
      branch: row.branch_filter || 'main',
    })
    if (res.data.code === 0) {
      ElMessage.success('已触发 GitHub Actions 构建')
      router.push(`/builds/${res.data.data.id}`)
    } else {
      ElMessage.error(res.data.message || '触发失败')
    }
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '触发失败')
  } finally {
    setTriggering(row.id, false)
  }
}

const handleDelete = async (id: number) => {
  try {
    const res = await pipelineApi.delete(id)
    if (res.data.code === 0) {
      ElMessage.success('删除成功')
      fetchPipelines()
    }
  } catch {
    ElMessage.error('删除失败')
  }
}

onMounted(fetchPipelines)
</script>
