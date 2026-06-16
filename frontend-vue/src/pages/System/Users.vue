<template>
  <div>
    <h1 style="margin-bottom: 16px">用户管理</h1>

    <el-card>
      <div style="margin-bottom: 16px">
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          创建用户
        </el-button>
      </div>

      <el-table :data="users" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="nickname" label="昵称" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag>{{ getRoleName(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ row.created_at || row.createdAt || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="warning" @click="handleResetPassword(row)">重置密码</el-button>
            <el-popconfirm title="确定删除该用户？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
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

    <el-dialog v-model="showCreateDialog" :title="editingUser ? '编辑用户' : '创建用户'" width="500" @closed="resetForm">
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="用户名" required>
          <el-input v-model="createForm.username" :disabled="!!editingUser" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item v-if="!editingUser" label="密码" required>
          <el-input v-model="createForm.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="createForm.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="createForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="createForm.role" placeholder="请选择角色">
            <el-option label="超级管理员" value="superadmin" />
            <el-option label="系统管理员" value="admin" />
            <el-option label="项目管理者" value="manager" />
            <el-option label="开发者" value="developer" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { userApi } from '@/api/user'
import { getRoleName } from '@/utils/permission'

const loading = ref(true)
const users = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const showCreateDialog = ref(false)
const editingUser = ref<any>(null)

const createForm = reactive({
  username: '',
  password: '',
  nickname: '',
  email: '',
  role: 'developer',
})

const resetForm = () => {
  editingUser.value = null
  createForm.username = ''
  createForm.password = ''
  createForm.nickname = ''
  createForm.email = ''
  createForm.role = 'developer'
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await userApi.getList({ page: currentPage.value, pageSize: pageSize.value })
    if (res.data.code === 0) {
      users.value = res.data.data?.items || res.data.data?.list || res.data.data || []
      total.value = res.data.data?.total || users.value.length || 0
    }
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchUsers()
}

const handleEdit = (user: any) => {
  resetForm()
  editingUser.value = user
  createForm.username = user.username
  createForm.nickname = user.nickname || ''
  createForm.email = user.email || ''
  createForm.role = user.role || 'developer'
  showCreateDialog.value = true
}

const handleCreate = () => {
  resetForm()
  showCreateDialog.value = true
}

const handleSubmit = async () => {
  try {
    if (editingUser.value) {
      const res = await userApi.update(editingUser.value.id, {
        nickname: createForm.nickname,
        email: createForm.email,
        role: createForm.role,
      })
      if (res.data.code === 0) {
        ElMessage.success('更新成功')
      } else {
        ElMessage.error(res.data.message || '更新失败')
        return
      }
    } else {
      if (!createForm.username || !createForm.password) {
        ElMessage.warning('请填写必填项')
        return
      }
      const res = await userApi.create(createForm)
      if (res.data.code === 0) {
        ElMessage.success('创建成功')
      } else {
        ElMessage.error(res.data.message || '创建失败')
        return
      }
    }
    showCreateDialog.value = false
    fetchUsers()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || (editingUser.value ? '更新失败' : '创建失败'))
  }
}

const handleResetPassword = async (user: any) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入新密码', '重置密码', {
      inputType: 'password',
      inputValidator: (v) => v && v.length >= 6 ? true : '密码至少 6 位',
    })
    await userApi.resetPassword(user.id, { password: value })
    ElMessage.success('密码已重置')
  } catch {
    // cancelled
  }
}

const handleDelete = async (id: number) => {
  const res = await userApi.delete(id)
  if (res.data.code === 0) {
    ElMessage.success('删除成功')
    fetchUsers()
  }
}

onMounted(fetchUsers)
</script>
