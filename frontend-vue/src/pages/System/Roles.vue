<template>
  <div>
    <h1 style="margin-bottom: 16px">角色管理</h1>

    <el-card>
      <el-table :data="roles" v-loading="loading" stripe>
        <el-table-column prop="code" label="角色编码" width="150" />
        <el-table-column prop="name" label="角色名称" width="150" />
        <el-table-column prop="level" label="级别" width="90" />
        <el-table-column label="系统角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_system ? 'success' : 'info'">{{ row.is_system ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="权限数" width="100">
          <template #default="{ row }">
            <el-tag>{{ permissionCountText(row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleDetail(row)">详情</el-button>
            <el-button v-if="row.code !== 'superadmin'" link type="primary" @click="handleEdit(row)">编辑权限</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showDetailDialog" title="角色详情" width="760">
      <div v-if="detailRole">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="角色编码">{{ detailRole.code }}</el-descriptions-item>
          <el-descriptions-item label="角色名称">{{ detailRole.name }}</el-descriptions-item>
          <el-descriptions-item label="级别">{{ detailRole.level }}</el-descriptions-item>
          <el-descriptions-item label="系统角色">{{ detailRole.is_system ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ detailRole.description || '-' }}</el-descriptions-item>
          <el-descriptions-item label="权限" :span="2">
            <div class="permission-tags">
              <el-tag
                v-for="permission in normalizedPermissions(detailRole)"
                :key="permission"
                size="small"
                effect="plain"
              >
                {{ permissionLabel(permission) }}
              </el-tag>
              <span v-if="normalizedPermissions(detailRole).length === 0">-</span>
            </div>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <el-dialog v-model="showEditDialog" title="编辑角色权限" width="760" @open="ensurePermissionsLoaded">
      <div v-if="editingRole">
        <div class="role-title">
          <span>{{ editingRole.name }}</span>
          <el-tag effect="plain">{{ editingRole.code }}</el-tag>
        </div>
        <el-tree
          ref="permissionTreeRef"
          :data="permissionTree"
          show-checkbox
          node-key="id"
          default-expand-all
          :props="{ label: 'label', children: 'children' }"
          class="permission-tree"
        />
      </div>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSavePermissions">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { ElTree } from 'element-plus'
import { roleApi } from '@/api/role'
import { permissionApi } from '@/api/permission'
import { getPermissionName, getPermissionResource } from '@/utils/permission-labels'

const loading = ref(true)
const saving = ref(false)
const roles = ref<any[]>([])
const showDetailDialog = ref(false)
const showEditDialog = ref(false)
const detailRole = ref<any>(null)
const editingRole = ref<any>(null)
const allPermissions = ref<any[]>([])
const permissionTree = ref<any[]>([])
const permissionTreeRef = ref<InstanceType<typeof ElTree>>()

function parsePermissions(value: any): string[] {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string')
  if (!value || typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

const normalizedPermissions = (role: any) => parsePermissions(role.permissions)

const hasAllPermissions = (role: any) => normalizedPermissions(role).includes('*')

const permissionCountText = (role: any) => hasAllPermissions(role) ? '全部' : normalizedPermissions(role).length

const permissionLabel = (code: string) => {
  if (code === '*') return '全部权限'
  const permission = allPermissions.value.find((item) => item.code === code)
  return getPermissionName(permission || code)
}

function buildPermissionTree(items: any[]) {
  const groups = new Map<string, any[]>()
  for (const item of items) {
    const resource = item.resource || 'other'
    groups.set(resource, [...(groups.get(resource) || []), item])
  }
  return Array.from(groups.entries()).map(([resource, permissions]) => ({
    id: `resource:${resource}`,
    label: getPermissionResource(resource),
    disabled: true,
    children: permissions.map((permission) => ({
      id: permission.code,
      label: `${getPermissionName(permission)}（${permission.code}）`,
    })),
  }))
}

const fetchPermissions = async () => {
  const res = await permissionApi.getList()
  if (res.data.code === 0) {
    allPermissions.value = res.data.data || []
    permissionTree.value = buildPermissionTree(allPermissions.value)
  }
}

const ensurePermissionsLoaded = async () => {
  if (allPermissions.value.length === 0) {
    await fetchPermissions()
  }
}

const fetchRoles = async () => {
  loading.value = true
  try {
    await fetchPermissions()
    const res = await roleApi.getList()
    if (res.data.code === 0) {
      roles.value = res.data.data?.items || res.data.data?.list || res.data.data || []
    }
  } finally {
    loading.value = false
  }
}

const handleDetail = (role: any) => {
  detailRole.value = role
  showDetailDialog.value = true
}

const handleEdit = async (role: any) => {
  editingRole.value = role
  showEditDialog.value = true
  await ensurePermissionsLoaded()
  await nextTick()
  permissionTreeRef.value?.setCheckedKeys(normalizedPermissions(role), false)
}

const handleSavePermissions = async () => {
  if (!editingRole.value) return

  saving.value = true
  try {
    const checked = permissionTreeRef.value?.getCheckedKeys(false) || []
    const permissions = checked.filter((key) => typeof key === 'string' && !key.startsWith('resource:'))
    const res = await roleApi.update(editingRole.value.id, { permissions })
    if (res.data.code === 0) {
      ElMessage.success('保存成功')
      showEditDialog.value = false
      fetchRoles()
    } else {
      ElMessage.error(res.data.message || '保存失败')
    }
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(fetchRoles)
</script>

<style scoped>
.permission-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.role-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.permission-tree {
  margin-top: 16px;
  max-height: 520px;
  overflow: auto;
}
</style>
