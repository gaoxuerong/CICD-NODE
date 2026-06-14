<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h1>环境管理</h1>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        创建环境
      </el-button>
    </div>

    <el-card>
      <el-table :data="environments" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag>{{ row.type || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-popconfirm title="确定删除该环境？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showCreateDialog" title="创建环境" width="500">
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="createForm.name" placeholder="请输入环境名称" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="createForm.type" placeholder="请选择类型">
            <el-option label="开发" value="development" />
            <el-option label="测试" value="staging" />
            <el-option label="生产" value="production" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="createForm.description" type="textarea" placeholder="请输入描述" />
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
import { environmentApi } from '@/api/environment'

const loading = ref(true)
const environments = ref<any[]>([])
const showCreateDialog = ref(false)

const createForm = reactive({
  name: '',
  type: '',
  description: '',
})

const fetchEnvironments = async () => {
  try {
    const res = await environmentApi.getList()
    if (res.data.code === 0) {
      environments.value = res.data.data?.items || res.data.data?.list || res.data.data || []
    }
  } finally {
    loading.value = false
  }
}

const handleCreate = async () => {
  if (!createForm.name) {
    ElMessage.warning('请输入环境名称')
    return
  }
  try {
    const res = await environmentApi.create(createForm)
    if (res.data.code === 0) {
      ElMessage.success('创建成功')
      showCreateDialog.value = false
      fetchEnvironments()
    }
  } catch {
    ElMessage.error('创建失败')
  }
}

const handleDelete = async (id: number) => {
  try {
    const res = await environmentApi.delete(id)
    if (res.data.code === 0) {
      ElMessage.success('删除成功')
      fetchEnvironments()
    }
  } catch {
    ElMessage.error('删除失败')
  }
}

onMounted(fetchEnvironments)
</script>
