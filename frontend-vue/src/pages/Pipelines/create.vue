<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h1>创建流水线</h1>
      <el-button @click="router.back()">返回</el-button>
    </div>

    <el-card>
      <el-form :model="form" label-width="100px" style="max-width: 600px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="请输入流水线名称" />
        </el-form-item>
        <el-form-item label="所属项目" required>
          <el-select v-model="form.projectId" placeholder="请选择项目" filterable @change="handleProjectChange">
            <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标环境" required>
          <el-select v-model="form.environmentId" placeholder="请选择目标环境" style="width: 100%" :disabled="!form.projectId">
            <el-option
              v-for="environment in environments"
              :key="environment.id"
              :label="`${environment.name} (${environmentTypeText(environment.type)})`"
              :value="environment.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="触发方式">
          <el-select v-model="form.triggerType" style="width: 100%">
            <el-option label="手动触发" value="manual" />
            <el-option label="Push 触发" value="push" />
            <el-option label="Tag 触发" value="tag" />
            <el-option label="定时触发" value="schedule" />
          </el-select>
        </el-form-item>
        <el-form-item label="分支过滤">
          <el-input v-model="form.branchFilter" placeholder="例如 main" />
        </el-form-item>
        <el-form-item label="Workflow">
          <el-input v-model="form.workflowId" placeholder="例如 build.yml" />
        </el-form-item>
        <el-form-item label="Ref">
          <el-input v-model="form.ref" placeholder="例如 main" />
        </el-form-item>
        <el-form-item label="配置">
          <el-input v-model="configPreview" type="textarea" :rows="8" readonly />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleCreate" :loading="submitting">创建</el-button>
          <el-button @click="router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { pipelineApi } from '@/api/pipeline'
import { projectApi } from '@/api/project'
import { environmentApi } from '@/api/environment'

const router = useRouter()
const submitting = ref(false)
const projects = ref<any[]>([])
const environments = ref<any[]>([])

const form = reactive({
  name: '',
  projectId: null as number | null,
  environmentId: null as number | null,
  triggerType: 'manual',
  branchFilter: 'main',
  workflowId: 'build.yml',
  ref: 'main',
})

const configPreview = computed(() => JSON.stringify({
  provider: 'github',
  workflow_id: form.workflowId,
  ref: form.ref,
  inputs: {
    branch: form.ref,
  },
}, null, 2))

const environmentTypeMap: Record<string, string> = {
  development: '开发',
  testing: '测试',
  staging: '预发',
  production: '生产',
}

const environmentTypeText = (type: string) => environmentTypeMap[type] || type || '-'

const fetchEnvironments = async (projectId: number) => {
  const res = await environmentApi.getList({ project_id: projectId, status: 'active' })
  if (res.data.code === 0) {
    environments.value = res.data.data?.items || res.data.data?.list || res.data.data || []
    form.environmentId = environments.value[0]?.id ?? null
  }
}

const handleProjectChange = async (projectId: number) => {
  form.environmentId = null
  environments.value = []
  if (projectId) {
    await fetchEnvironments(projectId)
  }
}

onMounted(async () => {
  try {
    const res = await projectApi.getList()
    if (res.data.code === 0) {
      const items = res.data.data?.items || res.data.data?.list || res.data.data || []
      projects.value = items.filter((project: any) => project.permissions?.canManagePipelines)
    }
  } catch {
    // ignore
  }
})

const handleCreate = async () => {
  if (!form.name || !form.projectId || !form.environmentId) {
    ElMessage.warning('请填写必填项')
    return
  }
  submitting.value = true
  try {
    const res = await pipelineApi.create({
      name: form.name,
      projectId: form.projectId,
      environmentId: form.environmentId,
      trigger_type: form.triggerType,
      branch_filter: form.branchFilter,
      config: configPreview.value,
    })
    if (res.data.code === 0) {
      ElMessage.success('创建成功')
      router.push('/pipelines')
    } else {
      ElMessage.error(res.data.message || '创建失败')
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || '创建失败')
  } finally {
    submitting.value = false
  }
}
</script>
