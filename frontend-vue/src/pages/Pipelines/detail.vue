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
        <el-descriptions-item label="名称">{{ pipeline.name }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="pipeline.status === 'active' ? 'success' : 'info'">
            {{ pipeline.status === 'active' ? '启用' : '禁用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">{{ pipeline.description || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ pipeline.createdAt }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { pipelineApi } from '@/api/pipeline'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const id = Number(route.params.id)
const pipeline = ref<any>(null)

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
