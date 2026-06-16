<template>
  <div v-loading="loading">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h1>项目详情</h1>
      <div>
        <el-button
          type="primary"
          :disabled="!project?.permissions?.canManageMembers"
          @click="router.push(`/projects/${project.id}/members`)"
        >
          成员管理
        </el-button>
        <el-button @click="router.back()">返回</el-button>
      </div>
    </div>

    <el-card v-if="project">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="项目名称">{{ project.name }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="project.status === 'active' ? 'success' : 'info'">
            {{ getStatusLabel(project.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="来源">{{ getSourceLabel(project.source) }}</el-descriptions-item>
        <el-descriptions-item label="语言">{{ project.language || '-' }}</el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">{{ project.description || '-' }}</el-descriptions-item>
        <el-descriptions-item label="仓库地址" :span="2">
          <el-link v-if="project.repositoryUrl" type="primary" :href="project.repositoryUrl" target="_blank">
            {{ project.repositoryUrl }}
          </el-link>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="Git 凭据">
          {{ project.git_credential_name || '无' }}
          <span v-if="project.git_credential_type">({{ project.git_credential_type }})</span>
        </el-descriptions-item>
        <el-descriptions-item label="默认分支">{{ project.defaultBranch || project.default_branch || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ project.created_at || project.createdAt || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card v-if="project" style="margin-top: 16px">
      <template #header>
        <span>项目成员</span>
      </template>
      <div class="member-groups">
        <div class="member-group">
          <div class="member-group__title">Owner</div>
          <div v-if="getMembersByRole('owner').length" class="member-tags">
            <el-tag v-for="member in getMembersByRole('owner')" :key="member.id" type="success">
              {{ getMemberName(member) }}
            </el-tag>
          </div>
          <el-empty v-else description="暂无 Owner" :image-size="60" />
        </div>
        <div class="member-group">
          <div class="member-group__title">Maintainer</div>
          <div v-if="getMembersByRole('maintainer').length" class="member-tags">
            <el-tag v-for="member in getMembersByRole('maintainer')" :key="member.id" type="warning">
              {{ getMemberName(member) }}
            </el-tag>
          </div>
          <el-empty v-else description="暂无 Maintainer" :image-size="60" />
        </div>
        <div class="member-group">
          <div class="member-group__title">Developer</div>
          <div v-if="getMembersByRole('developer').length" class="member-tags">
            <el-tag v-for="member in getMembersByRole('developer')" :key="member.id" type="info">
              {{ getMemberName(member) }}
            </el-tag>
          </div>
          <el-empty v-else description="暂无 Developer" :image-size="60" />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectApi } from '@/api/project'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const project = ref<any>(null)

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
const getMembersByRole = (role: 'owner' | 'maintainer' | 'developer') => project.value?.member_summary?.[role] || []
const getMemberName = (member: any) => member.nickname || member.username || `用户 ${member.id}`

onMounted(async () => {
  try {
    const id = Number(route.params.id)
    const res = await projectApi.getDetail(id)
    if (res.data.code === 0) {
      project.value = res.data.data
    }
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.member-groups {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.member-group {
  min-height: 120px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 14px;
}

.member-group__title {
  font-weight: 600;
  margin-bottom: 12px;
}

.member-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 900px) {
  .member-groups {
    grid-template-columns: 1fr;
  }
}
</style>
