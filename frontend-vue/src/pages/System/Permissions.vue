<template>
  <div>
    <h1 style="margin-bottom: 16px">权限管理</h1>

    <el-card>
      <el-table :data="permissions" v-loading="loading" stripe row-key="code">
        <el-table-column prop="code" label="权限编码" width="200" />
        <el-table-column prop="name" label="权限名称" />
        <el-table-column prop="group" label="分组" width="150" />
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { permissionApi } from '@/api/permission'

const loading = ref(true)
const permissions = ref<any[]>([])

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
