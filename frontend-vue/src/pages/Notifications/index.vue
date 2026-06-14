<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h1>通知</h1>
      <el-button @click="handleMarkAllRead">全部已读</el-button>
    </div>

    <el-card>
      <el-table :data="notifications" v-loading="loading" stripe>
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="content" label="内容" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'error' ? 'danger' : row.type === 'warning' ? 'warning' : 'info'">
              {{ row.type || '系统' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.read ? 'info' : 'success'">{{ row.read ? '已读' : '未读' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="时间" width="180" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button v-if="!row.read" link type="primary" @click="handleMarkRead(row.id)">标为已读</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { notificationApi } from '@/api/notification'

const loading = ref(true)
const notifications = ref<any[]>([])

const fetchNotifications = async () => {
  try {
    const res = await notificationApi.getList()
    if (res.data.code === 0) {
      notifications.value = res.data.data?.items || res.data.data?.list || res.data.data || []
    }
  } finally {
    loading.value = false
  }
}

const handleMarkRead = async (id: number) => {
  await notificationApi.markAsRead(id)
  fetchNotifications()
}

const handleMarkAllRead = async () => {
  await notificationApi.markAllAsRead()
  ElMessage.success('已全部标为已读')
  fetchNotifications()
}

onMounted(fetchNotifications)
</script>
