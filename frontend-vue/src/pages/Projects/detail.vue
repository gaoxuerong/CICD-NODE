<template>
  <div v-loading="loading">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h1>项目详情</h1>
      <el-button @click="router.back()">返回</el-button>
    </div>

    <el-card v-if="project">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="项目名称">{{ project.name }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="project.status === 'active' ? 'success' : 'info'">
            {{ project.status === 'active' ? '活跃' : '禁用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">{{ project.description || '-' }}</el-descriptions-item>
        <el-descriptions-item label="仓库地址" :span="2">
          <el-link v-if="project.repositoryUrl" type="primary" :href="project.repositoryUrl" target="_blank">
            {{ project.repositoryUrl }}
          </el-link>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="默认分支">{{ project.defaultBranch || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ project.createdAt }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectApi } from '@/api/project'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const project = ref<any>(null)

onMounted(async () => {
  try {
    const id = Number(route.params.id)
    const res = await projectApi.getDetail(id)
    if (res.data.code === 0) {
      project.value = res.data.data
    }
  } finally {
    loading.value = false
  }
})
</script>
