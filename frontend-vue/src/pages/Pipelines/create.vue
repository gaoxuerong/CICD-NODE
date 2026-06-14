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
          <el-select v-model="form.projectId" placeholder="请选择项目" filterable>
            <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="配置">
          <el-input v-model="form.configText" type="textarea" :rows="8" placeholder="YAML 配置内容" />
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
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { pipelineApi } from '@/api/pipeline'
import { projectApi } from '@/api/project'

const router = useRouter()
const submitting = ref(false)
const projects = ref<any[]>([])

const form = reactive({
  name: '',
  projectId: null as number | null,
  description: '',
  configText: '',
})

onMounted(async () => {
  try {
    const res = await projectApi.getList()
    if (res.data.code === 0) {
      projects.value = res.data.data?.items || res.data.data?.list || res.data.data || []
    }
  } catch {
    // ignore
  }
})

const handleCreate = async () => {
  if (!form.name || !form.projectId) {
    ElMessage.warning('请填写必填项')
    return
  }
  submitting.value = true
  try {
    const res = await pipelineApi.create({
      name: form.name,
      projectId: form.projectId,
      description: form.description,
      config: form.configText,
    })
    if (res.data.code === 0) {
      ElMessage.success('创建成功')
      router.push('/pipelines')
    } else {
      ElMessage.error(res.data.message || '创建失败')
    }
  } catch {
    ElMessage.error('创建失败')
  } finally {
    submitting.value = false
  }
}
</script>
