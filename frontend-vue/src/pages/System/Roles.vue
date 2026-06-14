<template>
  <div>
    <h1 style="margin-bottom: 16px">角色管理</h1>

    <el-card>
      <el-table :data="roles" v-loading="loading" stripe>
        <el-table-column prop="roleCode" label="角色编码" width="150" />
        <el-table-column prop="roleName" label="角色名称" />
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column label="权限数" width="100">
          <template #default="{ row }">
            <el-tag>{{ row.permissions?.length || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑权限</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showEditDialog" title="编辑角色权限" width="600">
      <div v-if="editingRole">
        <h3>{{ editingRole.roleName }}</h3>
        <el-checkbox-group v-model="selectedPermissions" style="margin-top: 16px">
          <div v-for="group in permissionGroups" :key="group.name" style="margin-bottom: 16px">
            <el-divider content-position="left">{{ group.name }}</el-divider>
            <el-checkbox v-for="perm in group.permissions" :key="perm.code" :label="perm.code">
              {{ perm.name }}
            </el-checkbox>
          </div>
        </el-checkbox-group>
      </div>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSavePermissions">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { roleApi } from '@/api/role'
import { permissionApi } from '@/api/permission'

const loading = ref(true)
const roles = ref<any[]>([])
const showEditDialog = ref(false)
const editingRole = ref<any>(null)
const selectedPermissions = ref<string[]>([])
const permissionGroups = ref<any[]>([])

const fetchRoles = async () => {
  try {
    const res = await roleApi.getList()
    if (res.data.code === 0) {
      roles.value = res.data.data?.items || res.data.data?.list || res.data.data || []
    }
  } finally {
    loading.value = false
  }
}

const handleEdit = async (role: any) => {
  editingRole.value = role
  selectedPermissions.value = [...(role.permissions || [])]
  try {
    const res = await permissionApi.getListGrouped()
    if (res.data.code === 0) {
      permissionGroups.value = res.data.data || []
    }
  } catch {
    permissionGroups.value = []
  }
  showEditDialog.value = true
}

const handleSavePermissions = async () => {
  try {
    await roleApi.updatePermissions(editingRole.value.roleCode, {
      permissions: selectedPermissions.value,
    })
    ElMessage.success('保存成功')
    showEditDialog.value = false
    fetchRoles()
  } catch {
    ElMessage.error('保存失败')
  }
}

onMounted(fetchRoles)
</script>
