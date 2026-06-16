<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h1>环境管理</h1>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        创建环境
      </el-button>
    </div>

    <el-card>
      <el-form :inline="true" :model="filters" style="margin-bottom: 12px">
        <el-form-item label="项目">
          <el-select v-model="filters.project_id" placeholder="全部项目" clearable filterable style="width: 220px" @change="fetchEnvironments">
            <el-option v-for="project in projects" :key="project.id" :label="project.name" :value="project.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="环境">
          <el-select v-model="filters.type" placeholder="全部环境" clearable style="width: 160px" @change="fetchEnvironments">
            <el-option v-for="item in environmentTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-table :data="environments" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="project_name" label="项目" min-width="160" show-overflow-tooltip />
        <el-table-column prop="name" label="环境名称" min-width="140" />
        <el-table-column label="环境类型" width="110">
          <template #default="{ row }">
            <el-tag :type="environmentTypeTag(row.type)">{{ environmentTypeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="访问地址" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link v-if="row.deploy_url" type="primary" :href="row.deploy_url" target="_blank">{{ row.deploy_url }}</el-link>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" min-width="180" show-overflow-tooltip />
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ row.created_at || row.createdAt || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-popconfirm title="确定删除该环境？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showDialog" :title="editingEnvironment ? '编辑环境' : '创建环境'" width="560" @closed="resetForm">
      <el-form :model="form" label-width="100px">
        <el-form-item label="所属项目" required>
          <el-select v-model="form.projectId" :disabled="!!editingEnvironment" placeholder="请选择项目" filterable style="width: 100%">
            <el-option v-for="project in projects" :key="project.id" :label="project.name" :value="project.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="环境类型" required>
          <el-select v-model="form.type" placeholder="请选择环境类型" style="width: 100%">
            <el-option v-for="item in environmentTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="环境名称" required>
          <el-input v-model="form.name" placeholder="例如 开发环境" />
        </el-form-item>
        <el-form-item label="访问地址">
          <el-input v-model="form.deployUrl" placeholder="例如 https://dev.example.com" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.active" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入环境用途说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { environmentApi } from '@/api/environment'
import { projectApi } from '@/api/project'

const loading = ref(true)
const submitting = ref(false)
const environments = ref<any[]>([])
const projects = ref<any[]>([])
const showDialog = ref(false)
const editingEnvironment = ref<any>(null)

const environmentTypeOptions = [
  { label: '开发', value: 'development' },
  { label: '测试', value: 'testing' },
  { label: '预发', value: 'staging' },
  { label: '生产', value: 'production' },
]

const filters = reactive({
  project_id: undefined as number | undefined,
  type: '',
})

const form = reactive({
  projectId: undefined as number | undefined,
  name: '',
  type: 'development',
  deployUrl: '',
  active: true,
  description: '',
})

const environmentTypeText = (type: string) => environmentTypeOptions.find((item) => item.value === type)?.label || type || '-'
const environmentTypeTag = (type: string) => {
  if (type === 'production') return 'danger'
  if (type === 'staging') return 'warning'
  if (type === 'testing') return 'success'
  return 'info'
}

const defaultNameByType = (type: string) => `${environmentTypeText(type)}环境`

const resetForm = () => {
  editingEnvironment.value = null
  form.projectId = filters.project_id
  form.name = ''
  form.type = 'development'
  form.deployUrl = ''
  form.active = true
  form.description = ''
}

const fetchProjects = async () => {
  const res = await projectApi.getList({ page: 1, pageSize: 100 })
  if (res.data.code === 0) {
    projects.value = res.data.data?.items || res.data.data?.list || res.data.data || []
  }
}

const fetchEnvironments = async () => {
  loading.value = true
  try {
    const res = await environmentApi.getList({
      project_id: filters.project_id || undefined,
      type: filters.type || undefined,
    })
    if (res.data.code === 0) {
      environments.value = res.data.data?.items || res.data.data?.list || res.data.data || []
    }
  } finally {
    loading.value = false
  }
}

const handleCreate = () => {
  resetForm()
  showDialog.value = true
}

const handleEdit = (row: any) => {
  editingEnvironment.value = row
  form.projectId = row.project_id || row.projectId
  form.name = row.name || ''
  form.type = row.type || 'development'
  form.deployUrl = row.deploy_url || row.deployUrl || ''
  form.active = row.status !== 'inactive'
  form.description = row.description || ''
  showDialog.value = true
}

const handleSubmit = async () => {
  if (!form.projectId) {
    ElMessage.warning('请选择项目')
    return
  }
  if (!form.name) {
    form.name = defaultNameByType(form.type)
  }

  submitting.value = true
  try {
    const payload = {
      projectId: form.projectId,
      name: form.name,
      type: form.type,
      deployUrl: form.deployUrl || undefined,
      status: form.active ? 'active' : 'inactive',
      description: form.description || undefined,
    }
    const res = editingEnvironment.value
      ? await environmentApi.update(editingEnvironment.value.id, payload)
      : await environmentApi.create(payload)
    if (res.data.code === 0) {
      ElMessage.success(editingEnvironment.value ? '保存成功' : '创建成功')
      showDialog.value = false
      fetchEnvironments()
    } else {
      ElMessage.error(res.data.message || '保存失败')
    }
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (id: number) => {
  try {
    const res = await environmentApi.delete(id)
    if (res.data.code === 0) {
      ElMessage.success('删除成功')
      fetchEnvironments()
    } else {
      ElMessage.error(res.data.message || '删除失败')
    }
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '删除失败')
  }
}

onMounted(async () => {
  await fetchProjects()
  await fetchEnvironments()
})
</script>
