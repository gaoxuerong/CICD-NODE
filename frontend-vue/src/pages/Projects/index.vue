<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h1>项目管理</h1>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        创建项目
      </el-button>
    </div>

    <el-card>
      <el-table :data="projects" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="项目名称">
          <template #default="{ row }">
            <el-link type="primary" @click="router.push(`/projects/${row.id}`)">{{ row.name }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '活跃' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="router.push(`/projects/${row.id}`)">详情</el-button>
            <el-button link type="primary" @click="router.push(`/projects/${row.id}/members`)">成员</el-button>
            <el-popconfirm title="确定删除该项目？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > pageSize"
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @current-change="handlePageChange"
      />
    </el-card>

    <el-dialog v-model="showCreateDialog" title="创建项目" width="500">
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="createForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="createForm.description" type="textarea" placeholder="请输入项目描述" />
        </el-form-item>
        <el-form-item label="仓库地址">
          <el-input v-model="createForm.repositoryUrl" placeholder="请输入 Git 仓库地址" />
        </el-form-item>
        <el-form-item label="默认分支">
          <el-input v-model="createForm.defaultBranch" placeholder="main" />
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
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { projectApi } from '@/api/project'

const router = useRouter()
const loading = ref(true)
const projects = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const showCreateDialog = ref(false)

const createForm = reactive({
  name: '',
  description: '',
  repositoryUrl: '',
  defaultBranch: 'main',
})

const fetchProjects = async () => {
  loading.value = true
  try {
    const res = await projectApi.getList({ page: currentPage.value, pageSize: pageSize.value })
    if (res.data.code === 0) {
      projects.value = res.data.data?.items || res.data.data?.list || res.data.data || []
      total.value = res.data.data?.total || projects.value.length || 0
    }
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchProjects()
}

const handleCreate = async () => {
  try {
    const res = await projectApi.create(createForm)
    if (res.data.code === 0) {
      ElMessage.success('创建成功')
      showCreateDialog.value = false
      fetchProjects()
    } else {
      ElMessage.error(res.data.message || '创建失败')
    }
  } catch {
    ElMessage.error('创建失败')
  }
}

const handleDelete = async (id: number) => {
  try {
    const res = await projectApi.delete(id)
    if (res.data.code === 0) {
      ElMessage.success('删除成功')
      fetchProjects()
    }
  } catch {
    ElMessage.error('删除失败')
  }
}

onMounted(fetchProjects)
</script>
