<template>
  <div>
    <h1 style="margin-bottom: 16px">审计日志</h1>

    <el-card>
      <div style="margin-bottom: 16px">
        <el-form :inline="true" :model="searchForm">
          <el-form-item label="用户">
            <el-input v-model="searchForm.username" placeholder="用户名" clearable />
          </el-form-item>
          <el-form-item label="操作">
            <el-input v-model="searchForm.action" placeholder="操作类型" clearable />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="fetchLogs">搜索</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table :data="logs" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户" width="120" />
        <el-table-column prop="action" label="操作" width="150" />
        <el-table-column prop="resource" label="资源" width="120" />
        <el-table-column prop="resourceId" label="资源ID" width="80" />
        <el-table-column prop="details" label="详情" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP" width="130" />
        <el-table-column prop="createdAt" label="时间" width="180" />
      </el-table>

      <el-pagination
        v-if="total > pageSize"
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
import { ref, onMounted, reactive } from 'vue'
import { auditLogApi } from '@/api/auditLog'

const loading = ref(true)
const logs = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

const searchForm = reactive({
  username: '',
  action: '',
})

const fetchLogs = async () => {
  loading.value = true
  try {
    const res = await auditLogApi.getList({
      page: currentPage.value,
      pageSize: pageSize.value,
      ...searchForm,
    })
    if (res.data.code === 0) {
      logs.value = res.data.data?.items || res.data.data?.list || res.data.data || []
      total.value = res.data.data?.total || logs.value.length || 0
    }
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchLogs()
}

onMounted(fetchLogs)
</script>
