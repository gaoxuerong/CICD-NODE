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
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="router.push(`/pipelines/${row.id}`)">详情</el-button>
            <el-button link type="primary" @click="router.push(`/pipelines/${row.id}/edit`)">编辑</el-button>
            <el-popconfirm title="确定删除该流水线？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
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
import { pipelineApi } from '@/api/pipeline'

const router = useRouter()
const loading = ref(true)
const pipelines = ref<any[]>([])

const fetchPipelines = async () => {
  try {
    const res = await pipelineApi.getList()
    if (res.data.code === 0) {
      pipelines.value = res.data.data?.items || res.data.data?.list || res.data.data || []
    }
  } finally {
    loading.value = false
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
