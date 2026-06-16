<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h1>项目管理</h1>
      <el-button v-if="canCreateProjects" type="primary" @click="openCreateDialog">
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
        <el-table-column prop="source" label="来源" width="100">
          <template #default="{ row }">
            {{ getSourceLabel(row.source) }}
          </template>
        </el-table-column>
        <el-table-column prop="language" label="语言" width="120">
          <template #default="{ row }">
            {{ row.language || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="Owner" width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.owner_names || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ row.created_at || row.createdAt || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="router.push(`/projects/${row.id}`)">详情</el-button>
            <el-button link type="primary" :disabled="!canEditProject(row)" @click="openEditDialog(row)">编辑</el-button>
            <el-popconfirm title="确定删除该项目？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button link type="danger" :disabled="!canDeleteProject(row)">删除</el-button>
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

    <!-- 创建项目弹窗 -->
    <el-dialog v-model="showCreateDialog" title="创建项目" width="500">
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="createForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="createForm.description" type="textarea" placeholder="请输入项目描述" />
        </el-form-item>
        <el-form-item label="来源">
          <el-select v-model="createForm.source" placeholder="请选择仓库来源" style="width: 100%">
            <el-option label="本地/手动" value="local" />
            <el-option label="GitHub" value="github" />
            <el-option label="GitLab" value="gitlab" />
            <el-option label="Gitee" value="gitee" />
            <el-option label="自定义 Git" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item label="仓库地址">
          <el-input v-model="createForm.repositoryUrl" placeholder="请输入 Git 仓库地址" />
        </el-form-item>
        <el-form-item label="Git 凭据">
          <div style="display: flex; gap: 8px; width: 100%">
            <el-select v-model="createForm.gitCredentialId" clearable placeholder="公开仓库可不选择" style="flex: 1">
              <el-option
                v-for="credential in gitCredentials"
                :key="credential.id"
                :label="`${credential.name} (${credential.type})`"
                :value="credential.id"
              />
            </el-select>
            <el-button v-if="userStore.hasPermission('git.manage')" @click="router.push('/system/git-credentials')">新建</el-button>
          </div>
        </el-form-item>
        <el-form-item v-if="createForm.source === 'github'" label="Owner">
          <el-input v-model="createForm.github_owner" placeholder="GitHub 用户名或组织名" />
        </el-form-item>
        <el-form-item v-if="createForm.source === 'github'" label="Repo">
          <el-input v-model="createForm.github_repo" placeholder="GitHub 仓库名" />
        </el-form-item>
        <el-form-item label="语言">
          <el-input v-model="createForm.language" placeholder="例如 TypeScript / Java / Go" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="createForm.status" style="width: 100%">
            <el-option label="活跃" value="active" />
            <el-option label="不活跃" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item label="默认分支">
          <el-input v-model="createForm.defaultBranch" placeholder="main" />
        </el-form-item>
        <el-divider content-position="left">项目成员</el-divider>
        <el-form-item label="Owner">
          <el-select v-model="createForm.ownerIds" multiple filterable placeholder="请选择项目所有者" style="width: 100%">
            <el-option
              v-for="user in users"
              :key="user.id"
              :label="getUserLabel(user)"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="维护者">
          <el-select v-model="createForm.maintainerIds" multiple filterable placeholder="请选择维护者" style="width: 100%">
            <el-option
              v-for="user in users"
              :key="user.id"
              :label="getUserLabel(user)"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="开发者">
          <el-select v-model="createForm.developerIds" multiple filterable placeholder="请选择开发者" style="width: 100%">
            <el-option
              v-for="user in users"
              :key="user.id"
              :label="getUserLabel(user)"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑项目弹窗 -->
    <el-dialog v-model="showEditDialog" title="编辑项目" width="500">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="editForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editForm.description" type="textarea" placeholder="请输入项目描述" />
        </el-form-item>
        <el-form-item label="来源">
          <el-select v-model="editForm.source" placeholder="请选择仓库来源" style="width: 100%">
            <el-option label="本地/手动" value="local" />
            <el-option label="GitHub" value="github" />
            <el-option label="GitLab" value="gitlab" />
            <el-option label="Gitee" value="gitee" />
            <el-option label="自定义 Git" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item label="仓库地址">
          <el-input v-model="editForm.repositoryUrl" placeholder="请输入 Git 仓库地址" />
        </el-form-item>
        <el-form-item label="Git 凭据">
          <div style="display: flex; gap: 8px; width: 100%">
            <el-select v-model="editForm.gitCredentialId" clearable placeholder="公开仓库可不选择" style="flex: 1">
              <el-option
                v-for="credential in gitCredentials"
                :key="credential.id"
                :label="`${credential.name} (${credential.type})`"
                :value="credential.id"
              />
            </el-select>
            <el-button v-if="userStore.hasPermission('git.manage')" @click="router.push('/system/git-credentials')">新建</el-button>
          </div>
        </el-form-item>
        <el-form-item v-if="editForm.source === 'github'" label="Owner">
          <el-input v-model="editForm.github_owner" placeholder="GitHub 用户名或组织名" />
        </el-form-item>
        <el-form-item v-if="editForm.source === 'github'" label="Repo">
          <el-input v-model="editForm.github_repo" placeholder="GitHub 仓库名" />
        </el-form-item>
        <el-form-item label="语言">
          <el-input v-model="editForm.language" placeholder="例如 TypeScript / Java / Go" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editForm.status" style="width: 100%">
            <el-option label="活跃" value="active" />
            <el-option label="不活跃" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item label="默认分支">
          <el-input v-model="editForm.defaultBranch" placeholder="main" />
        </el-form-item>
        <el-alert
          title="成员调整请进入项目详情或成员管理页面处理。"
          type="info"
          :closable="false"
          show-icon
        />
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="handleEdit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { projectApi } from '@/api/project'
import { gitCredentialApi } from '@/api/gitCredential'
import { userApi } from '@/api/user'
import { systemApi } from '@/api/system'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(true)
const projects = ref<any[]>([])
const gitCredentials = ref<any[]>([])
const users = ref<any[]>([])
const systemSettings = ref<Record<string, string>>({})
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const showCreateDialog = ref(false)
const showEditDialog = ref(false)

const createForm = reactive({
  name: '',
  description: '',
  repositoryUrl: '',
  source: 'local',
  gitCredentialId: null as number | null,
  github_owner: '',
  github_repo: '',
  language: '',
  status: 'active',
  defaultBranch: 'main',
  ownerIds: [] as number[],
  maintainerIds: [] as number[],
  developerIds: [] as number[],
})

const editForm = reactive({
  id: null as number | null,
  name: '',
  description: '',
  repositoryUrl: '',
  source: 'local',
  gitCredentialId: null as number | null,
  github_owner: '',
  github_repo: '',
  language: '',
  status: 'active',
  defaultBranch: 'main',
})

const sourceLabels: Record<string, string> = {
  local: '本地',
  github: 'GitHub',
  gitlab: 'GitLab',
  gitee: 'Gitee',
  custom: '自定义',
}

const statusLabels: Record<string, string> = {
  active: '活跃',
  inactive: '不活跃',
}

const getSourceLabel = (source?: string) => sourceLabels[source || ''] || source || '-'
const getStatusLabel = (status?: string) => statusLabels[status || ''] || status || '-'
const canCreateProjects = computed(() => userStore.hasPermission('projects.create'))
const canEditProject = (row: any) => Boolean(row.permissions?.canEdit)
const canDeleteProject = (row: any) => Boolean(row.permissions?.canDelete)
const currentUserId = computed(() => userStore.userInfo?.id ? Number(userStore.userInfo.id) : null)

const getUserLabel = (user: any) => {
  const displayName = user.nickname || user.username
  return user.email ? `${displayName} (${user.email})` : displayName
}

const buildMemberPayload = () => {
  const members: Array<{ user_id: number; role: 'owner' | 'maintainer' | 'developer' }> = []
  createForm.ownerIds.forEach((userId) => members.push({ user_id: userId, role: 'owner' }))
  createForm.maintainerIds.forEach((userId) => members.push({ user_id: userId, role: 'maintainer' }))
  createForm.developerIds.forEach((userId) => members.push({ user_id: userId, role: 'developer' }))
  return members
}

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

const fetchGitCredentials = async () => {
  if (!userStore.hasPermission('git.view')) {
    gitCredentials.value = []
    return
  }

  try {
    const res = await gitCredentialApi.getList()
    if (res.data.code === 0) {
      gitCredentials.value = res.data.data || []
    }
  } catch {
    gitCredentials.value = []
  }
}

const fetchUsers = async () => {
  try {
    const res = await userApi.getList({ page: 1, pageSize: 100 })
    if (res.data.code === 0) {
      users.value = res.data.data?.items || res.data.data?.list || res.data.data || []
    }
  } catch {
    users.value = []
  }
}

const fetchSystemSettings = async () => {
  try {
    const res = await systemApi.getSettings()
    if (res.data.code === 0) {
      systemSettings.value = res.data.data?.settings || {}
    }
  } catch {
    systemSettings.value = {}
  }
}

const openCreateDialog = async () => {
  createForm.name = ''
  createForm.description = ''
  createForm.repositoryUrl = ''
  createForm.source = systemSettings.value['git.default_provider'] || 'github'
  createForm.gitCredentialId = null
  createForm.github_owner = ''
  createForm.github_repo = ''
  createForm.language = ''
  createForm.status = 'active'
  createForm.defaultBranch = 'main'
  createForm.ownerIds = currentUserId.value ? [currentUserId.value] : []
  createForm.maintainerIds = []
  createForm.developerIds = []
  await Promise.all([fetchGitCredentials(), fetchUsers()])
  showCreateDialog.value = true
}

const handleCreate = async () => {
  try {
    if (createForm.ownerIds.length === 0) {
      ElMessage.warning('请至少选择一个 Owner')
      return
    }
    const payload = {
      ...createForm,
      gitCredentialId: createForm.gitCredentialId || null,
      members: buildMemberPayload(),
    }
    const res = await projectApi.create(payload)
    if (res.data.code === 0) {
      ElMessage.success('创建成功')
      showCreateDialog.value = false
      fetchProjects()
    } else {
      ElMessage.error(res.data.message || '创建失败')
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || '创建失败')
  }
}

const openEditDialog = async (row: any) => {
  editForm.id = row.id
  editForm.name = row.name || ''
  editForm.description = row.description || ''
  editForm.repositoryUrl = row.repositoryUrl || row.git_url || ''
  editForm.source = row.source || 'local'
  editForm.gitCredentialId = row.git_credential_id || row.gitCredentialId || null
  editForm.github_owner = row.github_owner || ''
  editForm.github_repo = row.github_repo || ''
  editForm.language = row.language || ''
  editForm.status = row.status || 'active'
  editForm.defaultBranch = row.defaultBranch || row.default_branch || 'main'
  await Promise.all([fetchGitCredentials(), fetchUsers()])
  showEditDialog.value = true
}

const handleEdit = async () => {
  if (!editForm.id) return
  try {
    const payload = {
      ...editForm,
      gitCredentialId: editForm.gitCredentialId || null,
    }
    const res = await projectApi.update(editForm.id, payload)
    if (res.data.code === 0) {
      ElMessage.success('更新成功')
      showEditDialog.value = false
      fetchProjects()
    } else {
      ElMessage.error(res.data.message || '更新失败')
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || '更新失败')
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

onMounted(() => {
  fetchSystemSettings()
  fetchProjects()
})
</script>
