<template>
  <div>
    <h1 style="margin-bottom: 16px">权限管理</h1>

    <el-card>
      <el-table :data="permissions" v-loading="loading" stripe row-key="code">
        <el-table-column prop="code" label="权限编码" width="210" />
        <el-table-column label="权限名称" min-width="180">
          <template #default="{ row }">{{ getPermissionName(row) }}</template>
        </el-table-column>
        <el-table-column label="分组" width="150">
          <template #default="{ row }">{{ getPermissionResource(row.resource) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showDetailDialog" title="权限详情" width="640">
      <el-descriptions v-if="detailPermission" :column="2" border>
        <el-descriptions-item label="权限编码">{{ detailPermission.code }}</el-descriptions-item>
        <el-descriptions-item label="权限名称">{{ getPermissionName(detailPermission) }}</el-descriptions-item>
        <el-descriptions-item label="分组">{{ getPermissionResource(detailPermission.resource) }}</el-descriptions-item>
        <el-descriptions-item label="动作">{{ getPermissionAction(detailPermission.action) }}</el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">{{ detailPermission.description || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { permissionApi } from '@/api/permission'
import { getPermissionAction, getPermissionName, getPermissionResource } from '@/utils/permission-labels'

const loading = ref(true)
const permissions = ref<any[]>([])
const showDetailDialog = ref(false)
const detailPermission = ref<any>(null)

const handleDetail = (row: any) => {
  detailPermission.value = row
  showDetailDialog.value = true
}

onMounted(async () => {
  try {
    const res = await permissionApi.getList()
    if (res.data.code === 0) {
      permissions.value = res.data.data?.items || res.data.data?.list || res.data.data || []
    }
  } finally {
    loading.value = false
  }
})
</script>
