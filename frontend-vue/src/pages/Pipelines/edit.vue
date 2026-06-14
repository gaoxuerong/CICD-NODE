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
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" />
        </el-form-item>
        <el-form-item label="配置">
          <el-input v-model="form.configText" type="textarea" :rows="8" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.active" active-text="启用" inactive-text="禁用" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSave" :loading="submitting">保存</el-button>
          <el-button @click="router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { pipelineApi } from '@/api/pipeline'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const submitting = ref(false)
const id = Number(route.params.id)
const pipeline = ref<any>(null)

const form = reactive({
  name: '',
  description: '',
  configText: '',
  active: true,
})

onMounted(async () => {
  try {
    const res = await pipelineApi.getDetail(id)
    if (res.data.code === 0) {
      pipeline.value = res.data.data
      form.name = res.data.data.name
      form.description = res.data.data.description || ''
      form.configText = typeof res.data.data.config === 'string' ? res.data.data.config : JSON.stringify(res.data.data.config, null, 2)
      form.active = res.data.data.status === 'active'
    }
  } finally {
    loading.value = false
  }
})

const handleSave = async () => {
  submitting.value = true
  try {
    const res = await pipelineApi.update(id, {
      name: form.name,
      description: form.description,
      config: form.configText,
      status: form.active ? 'active' : 'inactive',
    })
    if (res.data.code === 0) {
      ElMessage.success('保存成功')
      router.back()
    }
  } catch {
    ElMessage.error('保存失败')
  } finally {
    submitting.value = false
  }
}
</script>
