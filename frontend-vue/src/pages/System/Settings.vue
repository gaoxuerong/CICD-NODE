<template>
  <div>
    <h1 style="margin-bottom: 16px">系统配置</h1>

    <el-card>
      <el-form :model="form" label-width="120px" style="max-width: 600px" v-loading="loading">
        <el-divider content-position="left">基本设置</el-divider>
        <el-form-item label="系统名称">
          <el-input v-model="form.siteName" placeholder="CI/CD 平台" />
        </el-form-item>
        <el-form-item label="系统描述">
          <el-input v-model="form.siteDescription" type="textarea" placeholder="持续集成与持续交付平台" />
        </el-form-item>

        <el-divider content-position="left">SMTP 设置</el-divider>
        <el-form-item label="SMTP 服务器">
          <el-input v-model="form.smtpHost" placeholder="smtp.example.com" />
        </el-form-item>
        <el-form-item label="SMTP 端口">
          <el-input v-model.number="form.smtpPort" placeholder="587" />
        </el-form-item>
        <el-form-item label="发件人邮箱">
          <el-input v-model="form.smtpFrom" placeholder="noreply@example.com" />
        </el-form-item>

        <el-divider content-position="left">Git 设置</el-divider>
        <el-form-item label="默认分支">
          <el-input v-model="form.defaultBranch" placeholder="main" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
          <el-button @click="handleTestSmtp" :loading="testing">测试 SMTP</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { systemApi } from '@/api/system'

const loading = ref(true)
const saving = ref(false)
const testing = ref(false)

const form = reactive({
  siteName: '',
  siteDescription: '',
  smtpHost: '',
  smtpPort: 587,
  smtpFrom: '',
  defaultBranch: 'main',
})

onMounted(async () => {
  try {
    const res = await systemApi.getSettings()
    if (res.data.code === 0 && res.data.data) {
      Object.assign(form, res.data.data)
    }
  } finally {
    loading.value = false
  }
})

const handleSave = async () => {
  saving.value = true
  try {
    const res = await systemApi.updateSettings(form)
    if (res.data.code === 0) {
      ElMessage.success('保存成功')
    }
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const handleTestSmtp = async () => {
  testing.value = true
  try {
    await systemApi.testSmtp({ host: form.smtpHost, port: form.smtpPort })
    ElMessage.success('SMTP 连接测试成功')
  } catch {
    ElMessage.error('SMTP 连接测试失败')
  } finally {
    testing.value = false
  }
}
</script>
