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
            <el-select v-model="searchForm.action" placeholder="全部操作" clearable style="width: 180px">
              <el-option v-for="item in actionOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table :data="logs" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户" width="120" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">{{ actionText(row.action) }}</template>
        </el-table-column>
        <el-table-column label="对象类型" width="120">
          <template #default="{ row }">{{ targetTypeText(row.target_type) }}</template>
        </el-table-column>
        <el-table-column prop="target_name" label="对象" min-width="160" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP" width="140" />
        <el-table-column label="时间" width="180">
          <template #default="{ row }">{{ row.created_at || row.createdAt || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleDetail(row)">详情</el-button>
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

    <el-dialog v-model="showDetailDialog" title="审计详情" width="680">
      <el-descriptions v-if="detailLog" :column="2" border>
        <el-descriptions-item label="用户">{{ detailLog.username || '-' }}</el-descriptions-item>
        <el-descriptions-item label="操作">{{ actionText(detailLog.action) }}</el-descriptions-item>
        <el-descriptions-item label="对象类型">{{ targetTypeText(detailLog.target_type) }}</el-descriptions-item>
        <el-descriptions-item label="对象">{{ detailLog.target_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="IP">{{ detailLog.ip || '-' }}</el-descriptions-item>
        <el-descriptions-item label="时间">{{ detailLog.created_at || '-' }}</el-descriptions-item>
        <el-descriptions-item label="详情" :span="2">
          <pre class="details-block">{{ formatDetails(detailLog.details) }}</pre>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
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
const showDetailDialog = ref(false)
const detailLog = ref<any>(null)

const searchForm = reactive({
  username: '',
  action: '',
})

const actionOptions = [
  { value: 'user.create', label: '创建用户' },
  { value: 'user.update', label: '更新用户' },
  { value: 'user.delete', label: '删除用户' },
  { value: 'user.reset_password', label: '重置密码' },
  { value: 'role.create', label: '创建角色' },
  { value: 'role.update', label: '更新角色' },
  { value: 'role.delete', label: '删除角色' },
  { value: 'project.create', label: '创建项目' },
  { value: 'project.update', label: '更新项目' },
  { value: 'project.delete', label: '删除项目' },
  { value: 'project.member.add', label: '添加项目成员' },
  { value: 'project.member.remove', label: '移除项目成员' },
  { value: 'settings.update', label: '更新系统配置' },
  { value: 'settings.reset', label: '恢复默认配置' },
]

const targetTypeMap: Record<string, string> = {
  user: '用户',
  role: '角色',
  project: '项目',
  settings: '系统配置',
}

const actionText = (action: string) => actionOptions.find((item) => item.value === action)?.label || action
const targetTypeText = (type: string) => targetTypeMap[type] || type || '-'

const formatDetails = (details: string | null) => {
  if (!details) return '-'
  try {
    return JSON.stringify(JSON.parse(details), null, 2)
  } catch {
    return details
  }
}

const fetchLogs = async () => {
  loading.value = true
  try {
    const res = await auditLogApi.getList({
      page: currentPage.value,
      pageSize: pageSize.value,
      username: searchForm.username || undefined,
      action: searchForm.action || undefined,
    })
    if (res.data.code === 0) {
      logs.value = res.data.data?.items || res.data.data?.list || res.data.data || []
      total.value = res.data.data?.total || logs.value.length || 0
    }
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchLogs()
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchLogs()
}

const handleDetail = (row: any) => {
  detailLog.value = row
  showDetailDialog.value = true
}

onMounted(fetchLogs)
</script>

<style scoped>
.details-block {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
