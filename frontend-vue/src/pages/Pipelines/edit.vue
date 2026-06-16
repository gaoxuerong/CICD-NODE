<template>
  <div v-loading="loading">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h1>编辑流水线</h1>
      <el-button @click="router.back()">返回</el-button>
    </div>

    <el-card v-if="pipeline">
      <el-form :model="form" label-width="100px" style="max-width: 600px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="所属项目">
          <el-input :model-value="pipeline.project_name || pipeline.project?.name || '-'" disabled />
        </el-form-item>
        <el-form-item label="目标环境" required>
          <el-select v-model="form.environmentId" placeholder="请选择目标环境" style="width: 100%">
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
          <el-input v-model="form.branchFilter" />
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
        <el-form-item label="状态">
          <el-switch v-model="form.active" active-text="启用" inactive-text="禁用" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSave" :loading="submitting" :disabled="!canManagePipeline">保存</el-button>
          <el-button @click="router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { pipelineApi } from '@/api/pipeline'
import { environmentApi } from '@/api/environment'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const submitting = ref(false)
const id = Number(route.params.id)
const pipeline = ref<any>(null)
const environments = ref<any[]>([])
const canManagePipeline = computed(() => Boolean(pipeline.value?.permissions?.canManagePipelines))

const form = reactive({
  name: '',
  environmentId: null as number | null,
  triggerType: 'manual',
  branchFilter: 'main',
  workflowId: 'build.yml',
  ref: 'main',
  active: true,
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

function parseConfig(value: any) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

onMounted(async () => {
  try {
    const res = await pipelineApi.getDetail(id)
    if (res.data.code === 0) {
      pipeline.value = res.data.data
      form.name = res.data.data.name
      form.environmentId = res.data.data.environment_id || res.data.data.environmentId || null
      form.triggerType = res.data.data.trigger_type || 'manual'
      form.branchFilter = res.data.data.branch_filter || 'main'
      const config = parseConfig(res.data.data.config)
      form.workflowId = config.workflow_id || config.workflowId || 'build.yml'
      form.ref = config.ref || form.branchFilter || 'main'
      form.active = res.data.data.status === 'enabled'
      const envRes = await environmentApi.getList({ project_id: res.data.data.project_id, status: 'active' })
      if (envRes.data.code === 0) {
        environments.value = envRes.data.data?.items || envRes.data.data?.list || envRes.data.data || []
        if (!form.environmentId) {
          form.environmentId = environments.value[0]?.id ?? null
        }
      }
    }
  } finally {
    loading.value = false
  }
})

const handleSave = async () => {
  if (!canManagePipeline.value) {
    ElMessage.warning('没有权限编辑该流水线')
    return
  }
  submitting.value = true
  try {
    const res = await pipelineApi.update(id, {
      name: form.name,
      environmentId: form.environmentId,
      trigger_type: form.triggerType,
      branch_filter: form.branchFilter,
      config: configPreview.value,
      status: form.active ? 'enabled' : 'disabled',
    })
    if (res.data.code === 0) {
      ElMessage.success('保存成功')
      router.back()
    } else {
      ElMessage.error(res.data.message || '保存失败')
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}
</script>
