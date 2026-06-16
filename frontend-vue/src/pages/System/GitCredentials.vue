<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h1>Git 凭据</h1>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        创建凭据
      </el-button>
    </div>

    <el-card>
      <el-table :data="credentials" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag>{{ row.type || 'SSH' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户名" />
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ row.created_at || row.createdAt || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-popconfirm title="确定删除该凭据？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showCreateDialog" title="创建 Git 凭据" width="500">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="createForm.name" placeholder="请输入凭据名称" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="createForm.type" style="width: 100%">
            <el-option label="SSH Key" value="ssh_key" />
            <el-option label="Token" value="token" />
            <el-option label="用户名密码" value="password" />
            <el-option label="OAuth" value="oauth" />
          </el-select>
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="createForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item v-if="createForm.type === 'ssh_key'" label="私钥">
          <el-input v-model="createForm.credential" type="textarea" :rows="6" placeholder="粘贴 SSH 私钥" />
        </el-form-item>
        <el-form-item v-else label="密码/Token">
          <el-input v-model="createForm.credential" type="textarea" :rows="3" placeholder="请输入密码或 Token" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="createForm.description" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { gitCredentialApi } from '@/api/gitCredential'

const loading = ref(true)
const credentials = ref<any[]>([])
const showCreateDialog = ref(false)

const createForm = reactive({
  name: '',
  type: 'token',
  username: '',
  credential: '',
  description: '',
})

const fetchCredentials = async () => {
  try {
    const res = await gitCredentialApi.getList()
    if (res.data.code === 0) {
      credentials.value = res.data.data?.items || res.data.data?.list || res.data.data || []
    }
  } finally {
    loading.value = false
  }
}

const handleCreate = async () => {
  if (!createForm.name || !createForm.credential) {
    ElMessage.warning('请输入凭据名称和凭据内容')
    return
  }
  try {
    const res = await gitCredentialApi.create({
      name: createForm.name,
      type: createForm.type,
      username: createForm.username || undefined,
      credential: createForm.credential,
      description: createForm.description || undefined,
    })
    if (res.data.code === 0) {
      ElMessage.success('创建成功')
      showCreateDialog.value = false
      createForm.name = ''
      createForm.type = 'token'
      createForm.username = ''
      createForm.credential = ''
      createForm.description = ''
      fetchCredentials()
    } else {
      ElMessage.error(res.data.message || '创建失败')
    }
  } catch {
    ElMessage.error('创建失败')
  }
}

const handleDelete = async (id: number) => {
  try {
    const res = await gitCredentialApi.delete(id)
    if (res.data.code === 0) {
      ElMessage.success('删除成功')
      fetchCredentials()
    }
  } catch {
    ElMessage.error('删除失败')
  }
}

onMounted(fetchCredentials)
</script>
