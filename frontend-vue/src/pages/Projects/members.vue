<template>
  <div v-loading="loading">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h1>成员管理</h1>
      <div>
        <el-button type="primary" @click="showAddDialog = true">添加成员</el-button>
        <el-button @click="router.back()">返回</el-button>
      </div>
    </div>

    <el-card>
      <el-table :data="members" stripe>
        <el-table-column prop="userId" label="用户ID" width="100" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="role" label="角色">
          <template #default="{ row }">
            <el-tag>{{ getRoleName(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="joinedAt" label="加入时间" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-popconfirm title="确定移除该成员？" @confirm="handleRemove(row.userId)">
              <template #reference>
                <el-button link type="danger">移除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showAddDialog" title="添加成员" width="400">
      <el-form :model="addForm" label-width="80px">
        <el-form-item label="用户ID">
          <el-input v-model.number="addForm.userId" placeholder="请输入用户ID" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="addForm.role" placeholder="请选择角色">
            <el-option label="开发者" value="developer" />
            <el-option label="维护者" value="maintainer" />
            <el-option label="访客" value="guest" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAdd">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { projectApi } from '@/api/project'
import { getRoleName } from '@/utils/permission'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const members = ref<any[]>([])
const showAddDialog = ref(false)

const addForm = reactive({
  userId: null as number | null,
  role: 'developer',
})

const projectId = Number(route.params.projectId)

const fetchMembers = async () => {
  try {
    const res = await projectApi.getMembers(projectId)
    if (res.data.code === 0) {
      members.value = res.data.data || []
    }
  } finally {
    loading.value = false
  }
}

const handleAdd = async () => {
  if (!addForm.userId) {
    ElMessage.warning('请输入用户ID')
    return
  }
  try {
    const res = await projectApi.addMember(projectId, addForm)
    if (res.data.code === 0) {
      ElMessage.success('添加成功')
      showAddDialog.value = false
      fetchMembers()
    }
  } catch {
    ElMessage.error('添加失败')
  }
}

const handleRemove = async (userId: number) => {
  try {
    const res = await projectApi.removeMember(projectId, userId)
    if (res.data.code === 0) {
      ElMessage.success('移除成功')
      fetchMembers()
    }
  } catch {
    ElMessage.error('移除失败')
  }
}

onMounted(fetchMembers)
</script>
